/**
 * MonadFlow — Smoke E2E de la capa API (Agente 05 QA).
 * Cubre el checklist F1/F2 de TASK_BACKLOG_QA_DEMO.md a nivel servidor:
 * merchant (tarifa, killswitch, regenerar QR), sesiones de consumo,
 * acuerdos por etapas (stage0_locked, cancel, refund), alias, balances,
 * transferencias P2P y feed de actividad unificado.
 *
 * Uso: node smoke_e2e.mjs <baseUrl>
 *   node smoke_e2e.mjs http://localhost:3001   # mock mode
 *   node smoke_e2e.mjs http://localhost:3000   # chain mode (API layer is shared)
 */

const BASE = process.argv[2] ?? 'http://localhost:3001';
const RUN = `qa-${Date.now().toString(36)}`;
const USER = `user-${RUN}`;
const USER2 = `user2-${RUN}`;

let pass = 0;
let fail = 0;
const results = [];

function check(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  if (ok) pass++; else fail++;
  const line = `[${mark}] ${name}${detail ? ` — ${detail}` : ''}`;
  results.push(line);
  console.log(line);
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

async function main() {
  console.log(`# Smoke E2E — ${new Date().toISOString()} — base ${BASE}\n`);

  // ---------- Modo 1: Comercio + Consumo ----------
  console.log('## Modo 1 — Comercio / Consumo por tiempo');

  const m0 = await api('GET', '/api/merchant');
  check('GET /api/merchant responde estado', m0.status === 200 && !!m0.data.qrId,
    `qrId=${m0.data?.qrId} active=${m0.data?.active} rate=${m0.data?.ratePerMinute}`);

  const m1 = await api('POST', '/api/merchant', {
    action: 'update', name: 'Cowork QA', ratePerMinute: 30,
  });
  check('Editar tarifa/nombre del comercio', m1.status === 200 && m1.data.ratePerMinute === 30 && m1.data.name === 'Cowork QA',
    `rate=${m1.data?.ratePerMinute} name=${m1.data?.name}`);

  // Asegurar activo antes del check-in (puede quedar inactivo de runs previos)
  await api('POST', '/api/merchant', { action: 'regenerate' });

  const s1 = await api('POST', '/api/sessions', {
    userId: USER, userName: 'Cliente QA', maxCap: 5000, currency: 'ARS',
  });
  check('Check-in con auto-cap crea sesión', s1.status === 201 && s1.data.ended === false,
    `id=${s1.data?.id} cap=${s1.data?.maxCap} rate/s=${s1.data?.ratePerSecond}`);

  const sid = s1.data?.id;

  const sDup = await api('POST', '/api/sessions', {
    userId: USER, userName: 'Cliente QA', maxCap: 5000, currency: 'ARS',
  });
  check('Re-scan QR no duplica sesión (409 active_session)',
    sDup.status === 409 && sDup.data?.error === 'active_session' && sDup.data?.session?.id === sid);

  await new Promise((r) => setTimeout(r, 1100));
  const sLive = await api('GET', `/api/sessions/${sid}`);
  check('Sesión viva acumula tiempo', sLive.status === 200 && sLive.data.ended === false,
    `elapsed=${Date.now() - sLive.data.startTime}ms`);

  const sEnd = await api('POST', `/api/sessions/${sid}`, { action: 'end', totalPaid: 12.5 });
  check('Finalizar sesión cierra con monto', sEnd.status === 200 && sEnd.data.ended === true && sEnd.data.totalPaid === 12.5,
    `totalPaid=${sEnd.data?.totalPaid}`);

  const mOff = await api('POST', '/api/merchant', { action: 'deactivate' });
  check('Killswitch OFF desactiva QR', mOff.status === 200 && mOff.data.active === false);

  const sBlocked = await api('POST', '/api/sessions', {
    userId: USER2, userName: 'Otro', maxCap: 100, currency: 'ARS',
  });
  check('Check-in bloqueado con QR inactivo (409 merchant_inactive)',
    sBlocked.status === 409 && sBlocked.data?.error === 'merchant_inactive');

  // Sesión activa que la regeneración debe cerrar
  await api('POST', '/api/merchant', { action: 'regenerate' });
  const sOrphan = await api('POST', '/api/sessions', {
    userId: USER2, userName: 'Huerfana', maxCap: 100, currency: 'ARS',
  });
  const mRegen = await api('POST', '/api/merchant', { action: 'regenerate' });
  const sOrphanAfter = await api('GET', `/api/sessions/${sOrphan.data?.id}`);
  check('Regenerar QR cierra sesiones activas y cobra lo consumido',
    mRegen.status === 200 && sOrphanAfter.data?.ended === true && typeof sOrphanAfter.data?.totalPaid === 'number',
    `nuevoQr=${mRegen.data?.qrId} huerfana.ended=${sOrphanAfter.data?.ended} paid=${sOrphanAfter.data?.totalPaid}`);

  // ---------- Modo 2: Acuerdo por etapas ----------
  console.log('\n## Modo 2 — Acuerdo con fondo protegido por etapas');

  const a1 = await api('POST', '/api/agreements', {
    title: 'Landing page QA', totalAmount: 9000, currency: 'ARS',
    stageCount: 3, contractorId: `contratista-${RUN}`, contractorName: 'Dev QA',
    autoApproveDays: 0,
  });
  check('Crear acuerdo (3 etapas, $9.000 ARS)', a1.status === 201 && a1.data.status === 'pending' && a1.data.stages.length === 3,
    `id=${a1.data?.id}`);
  const aid = a1.data?.id;

  const aCancelEarly = await api('POST', `/api/agreements/${aid}`, { action: 'cancel' });
  check('Cancelar antes del depósito es inválido (409)', aCancelEarly.status === 409);

  const aKill = await api('POST', `/api/agreements/${aid}`, { action: 'deactivate-link' });
  check('Killswitch del link pre-depósito', aKill.status === 200 && aKill.data.linkActive === false);

  const aDepBlocked = await api('POST', `/api/agreements/${aid}`, {
    action: 'deposit', clientId: USER, clientName: 'Cliente QA',
  });
  check('Depósito bloqueado con link inactivo (409 link_inactive)',
    aDepBlocked.status === 409 && aDepBlocked.data?.error === 'link_inactive');

  await api('POST', `/api/agreements/${aid}`, { action: 'reactivate-link' });
  const aDep = await api('POST', `/api/agreements/${aid}`, {
    action: 'deposit', clientId: USER, clientName: 'Cliente QA',
  });
  check('Depósito 100% activa el acuerdo + autoriza etapa 1',
    aDep.status === 200 && aDep.data.status === 'active' && !!aDep.data.stages[0].authorizedAt);

  const aCancelLocked = await api('POST', `/api/agreements/${aid}`, { action: 'cancel' });
  check('REGLA CLAVE: cancelar bloqueado antes de pagar etapa 1 (409 stage0_locked)',
    aCancelLocked.status === 409 && aCancelLocked.data?.error === 'stage0_locked',
    `error=${aCancelLocked.data?.error}`);

  const aDel0 = await api('POST', `/api/agreements/${aid}`, { action: 'deliver', stageIndex: 0 });
  check('Contratista entrega etapa 1', aDel0.status === 200 && !!aDel0.data.stages[0].deliveredAt);

  const aApp0 = await api('POST', `/api/agreements/${aid}`, { action: 'approve', stageIndex: 0 });
  check('Cliente aprueba etapa 1 → pagada', aApp0.status === 200 && aApp0.data.stages[0].approved === true && !!aApp0.data.stages[0].paidAt);

  // Entregar etapa 2 sin autorización → debe fallar
  const aDelUnauth = await api('POST', `/api/agreements/${aid}`, { action: 'deliver', stageIndex: 1 });
  check('Entregar etapa 2 sin autorización falla (403 stage_not_authorized)',
    aDelUnauth.status === 403 && aDelUnauth.data?.error === 'stage_not_authorized');

  const aCancel = await api('POST', `/api/agreements/${aid}`, { action: 'cancel' });
  check('Cancelar habilitado tras pagar etapa 1 → cancelled', aCancel.status === 200 && aCancel.data.status === 'cancelled' && !!aCancel.data.cancelledAt);

  const aAfter = await api('GET', `/api/agreements/${aid}`);
  const frozen = aAfter.data?.stages.filter((s) => !s.approved).length * (aAfter.data?.totalAmount / aAfter.data?.stageCount);
  check('Reembolso = etapas no aprobadas (2/3 → $6.000 ARS)', frozen === 6000, `frozen=${frozen}`);

  // ---------- Modo 3: Alias + Transferencias P2P ----------
  console.log('\n## Modo 3 — Transferencias P2P por alias');

  const al = await api('POST', '/api/aliases', {
    userId: USER2, alias: `qa-${RUN.slice(-6)}.mp`, displayName: 'Destino QA',
  });
  check('Registrar alias', al.status === 201 && al.data.alias.includes('.mp'), `alias=${al.data?.alias}`);

  const alLookup = await api('GET', `/api/aliases?alias=${al.data?.alias}`);
  check('Lookup de alias resuelve destinatario', alLookup.status === 200 && alLookup.data.displayName === 'Destino QA');

  const alBad = await api('GET', '/api/aliases?alias=noexiste.mp');
  check('Alias inexistente → 404 alias_not_found', alBad.status === 404 && alBad.data?.error === 'alias_not_found');

  // Cargar saldo (simula Mercado Pago)
  const dep = await api('POST', '/api/balances', {
    userId: USER, delta: 10000, currency: 'ARS', reason: 'deposit',
  });
  check('Cargar saldo ARS (mock Mercado Pago)', dep.status === 200 && dep.data.ARS >= 10000, `ARS=${dep.data?.ARS}`);

  const tNoFunds = await api('POST', '/api/transfers', {
    fromUserId: USER, fromName: 'Cliente QA', toAlias: al.data?.alias,
    amount: 99999999, currency: 'ARS',
  });
  check('Saldo insuficiente → 402 insufficient_funds',
    tNoFunds.status === 402 && tNoFunds.data?.error === 'insufficient_funds');

  const t1 = await api('POST', '/api/transfers', {
    fromUserId: USER, fromName: 'Cliente QA', toAlias: al.data?.alias,
    amount: 1500, currency: 'ARS', note: 'pago qa',
  });
  check('Transferencia por alias → comprobante #ID', t1.status === 201 && t1.data.id?.startsWith('tr-'),
    `id=${t1.data?.id} status=${t1.data?.status}`);

  const tReceipt = await api('GET', `/api/transfers/${t1.data?.id}`);
  check('Comprobante consultable por ID', tReceipt.status === 200 && tReceipt.data.amount === 1500);

  const balAfter = await api('GET', `/api/balances?user=${USER}`);
  check('Saldo debitado post-transferencia', balAfter.status === 200 && balAfter.data.ARS === (dep.data.ARS - 1500),
    `ARS=${balAfter.data?.ARS}`);

  const balDest = await api('GET', `/api/balances?user=${USER2}`);
  check('Destinatario acreditado', balDest.status === 200 && balDest.data.ARS >= 1500, `ARS=${balDest.data?.ARS}`);

  const tHist = await api('GET', `/api/transfers?user=${USER}`);
  check('Historial de transferencias', tHist.status === 200 && tHist.data.some((t) => t.id === t1.data?.id));

  // ---------- Feed unificado ----------
  console.log('\n## Feed de actividad unificado');

  const feed = await api('GET', `/api/activity?user=${USER}`);
  const kinds = new Set((feed.data ?? []).map((i) => i.kind));
  check('Feed incluye depósito fiat', feed.status === 200 && kinds.has('deposit'));
  check('Feed incluye transferencia enviada', kinds.has('transfer_sent'));
  check('Feed incluye consumo (sesión)', kinds.has('consumo'));
  check('Feed incluye escrow (depósito/release/refund)',
    kinds.has('escrow_deposit') && kinds.has('escrow_release') && kinds.has('escrow_refund'),
    `kinds=${[...kinds].join(',')}`);

  const feedDest = await api('GET', `/api/activity?user=${USER2}`);
  check('Destinatario ve transfer_received', (feedDest.data ?? []).some((i) => i.kind === 'transfer_received'));

  // ---------- Caminos de error genéricos ----------
  console.log('\n## Errores — nunca texto técnico');

  const s404 = await api('GET', '/api/sessions/op-inexistente');
  check('Sesión inexistente → 404 not_found', s404.status === 404 && s404.data?.error === 'not_found');

  const a404 = await api('GET', '/api/agreements/ag-inexistente');
  check('Acuerdo inexistente → 404 not_found', a404.status === 404);

  const badAction = await api('POST', `/api/agreements/${aid}`, { action: 'hack' });
  check('Acción desconocida → 400', badAction.status === 400);

  // ---------- Resumen ----------
  console.log(`\n# RESULTADO: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('SMOKE CRASH:', e); process.exitCode = 2; });
