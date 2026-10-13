'use client';

import { postActivity, type ActivityPost } from './api';
import type { Agreement } from './api';

const SEEN_KEY = 'mf:actrep';

/**
 * Fire-and-forget activity reporter for chain-mode money events.
 * A localStorage guard skips repeat calls for the same dedupeKey;
 * the server dedupes too, so reporting is always idempotent.
 */
export const reportActivity = (body: ActivityPost): void => {
  if (body.dedupeKey) {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
      const k = `${body.userId}:${body.dedupeKey}`;
      if (seen.includes(k)) return;
      seen.push(k);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-500)));
    } catch {
      /* storage full/blocked — server dedupe still covers us */
    }
  }
  postActivity(body).catch(() => {});
};

/**
 * Sync-on-read for escrow stage events: when a merged (on-chain) agreement
 * shows paid milestones, report the entry this user's feed is missing.
 * - client → 'escrow_release' (they paid each stage)
 * - contractor → 'escrow_payment' (they received each stage)
 */
export const reportEscrowStageEvents = (
  a: Agreement,
  userId: string,
  role: 'client' | 'contractor',
): void => {
  if (!a.chainId) return;
  const kind = role === 'client' ? 'escrow_release' : 'escrow_payment';
  const prefix = role === 'client' ? 'escrowrel' : 'escrowpay';
  const stageAmt = a.totalAmount / a.stageCount;
  a.stages.forEach((s, i) => {
    if (!s.paidAt) return;
    reportActivity({
      userId,
      kind,
      amount: stageAmt,
      currency: a.currency,
      label: `Etapa ${i + 1} · ${a.title}`,
      refId: a.id,
      dedupeKey: `${prefix}:${a.chainId}:s${i}`,
      at: s.paidAt,
    });
  });
};
