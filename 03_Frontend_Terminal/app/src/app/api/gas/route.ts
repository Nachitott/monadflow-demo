import { NextRequest, NextResponse } from 'next/server';
import {
  createWalletClient,
  http,
  isAddress,
  parseEther,
  publicActions,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '@/lib/chains';

export const dynamic = 'force-dynamic';

const MIN_BALANCE = parseEther('0.01');
const TOP_UP = parseEther('0.05');

/**
 * Silent gas faucet: tops up a user's embedded wallet so every action
 * "just works" — the user never learns that network fees exist.
 * Server-side only; GAS_FAUCET_PRIVATE_KEY never reaches the client.
 * No-ops cleanly when the key isn't configured (local dev).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const address = String(body.address ?? '');
  if (!isAddress(address))
    return NextResponse.json({ error: 'invalid_address' }, { status: 400 });

  const pk = process.env.GAS_FAUCET_PRIVATE_KEY;
  if (!pk) return NextResponse.json({ funded: false, reason: 'no_funder' });

  const account = privateKeyToAccount(
    (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`,
  );
  const client = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(monadTestnet.rpcUrls.default.http[0]),
  }).extend(publicActions);

  try {
    const balance = await client.getBalance({ address: address as `0x${string}` });
    if (balance >= MIN_BALANCE)
      return NextResponse.json({ funded: false, balance: balance.toString() });

    const hash = await client.sendTransaction({
      to: address as `0x${string}`,
      value: TOP_UP,
    });
    return NextResponse.json({ funded: true, hash });
  } catch {
    return NextResponse.json({ funded: false, reason: 'faucet_error' });
  }
}
