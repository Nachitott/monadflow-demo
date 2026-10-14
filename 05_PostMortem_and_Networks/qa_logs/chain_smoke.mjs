/**
 * MonadFlow — Smoke ON-CHAIN real (Agente 05 QA) — F2 de TASK_BACKLOG_QA_DEMO.
 * Ejecuta contra Monad Testnet los mismos flujos que dispara la UI:
 *   faucet /api/gas → mint mARS/mUSDC → setRate → approve+startStream →
 *   stopStream (StreamSettled paid/refund) → createProject (escrow 100%) →
 *   cancelProject bloqueado pre-etapa-1 → deliverStage → approveStage →
 *   cancelProject (refund) → transfer P2P ERC-20 → swap ARS→USD.
 *
 * Corre desde 03_Frontend_Terminal/app (usa su node_modules con viem):
 *   node ../../05_PostMortem_and_Networks/qa_logs/chain_smoke.mjs [gasApiBase]
 * Nunca imprime la private key; los tx hashes son evidencia pública.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient, createWalletClient, http, defineChain,
  parseUnits, formatUnits, decodeEventLog,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '../../03_Frontend_Terminal/app');
const GAS_API = process.argv[2] ?? 'http://localhost:3000';

// Carga .env.local de la app (keys requeridas: GAS_FAUCET_PRIVATE_KEY + NEXT_PUBLIC_*)
process.loadEnvFile(path.join(APP, '.env.local'));

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz'] } },
});

const C = {
  timeStream: process.env.NEXT_PUBLIC_TIME_STREAM,
  escrow: process.env.NEXT_PUBLIC_MILESTONE_ESCROW,
  usdc: process.env.NEXT_PUBLIC_MOCK_USDC,
  ars: process.env.NEXT_PUBLIC_MOCK_ARS,
  exchange: process.env.NEXT_PUBLIC_MOCK_EXCHANGE,
};
const abi = (n) => JSON.parse(readFileSync(path.join(APP, `src/lib/abis/${n}.json`), 'utf8'));
const ABIS = {
  ts: abi('TimeStream'), esc: abi('MilestoneEscrow'),
  ars: abi('MockARS'), usdc: abi('MockUSDC'), ex: abi('MockExchange'),
};

const pub = createPublicClient({ chain: monadTestnet, transport: http(monadTestnet.rpcUrls.default.http[0]) });
const pk = process.env.GAS_FAUCET_PRIVATE_KEY;
if (!pk) { console.error('FALTA GAS_FAUCET_PRIVATE_KEY'); process.exit(2); }
const deployer = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
const qa = privateKeyToAccount(generatePrivateKey());
const wDeployer = createWalletClient({ account: deployer, chain: monadTestnet, transport: http() });
const wQa = createWalletClient({ account: qa, chain: monadTestnet, transport: http() });

let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${n}${d ? ' — ' + d : ''}`);
  ok ? pass++ : fail++;
};
const lat = [];
async function tx(w, label, req) {
  const t0 = Date.now();
  const hash = await w.writeContract(req);
  const r = await pub.waitForTransactionReceipt({ hash });
  const ms = Date.now() - t0;
  lat.push(ms);
  console.log(`    tx ${label}: ${hash} (confirmó en ${ms}ms, status ${r.status})`);
  if (r.status !== 'success') { check(`${label} confirmó`, false, hash); throw new Error(label); }
  return { hash, receipt: r };
}
const erc20Bal = async (token, who) => pub.readContract({ address: token, abi: ABIS.ars, functionName: 'balanceOf', args: [who] });

async function main() {
  console.log(`# Chain smoke — ${new Date().toISOString()} — chain 10143`);
  console.log(`qa=${qa.address} deployer=${deployer.address}\n`);

  // ── 1. Faucet de gas (/api/gas fondea silenciosamente) ──
  const g = await fetch(`${GAS_API}/api/gas`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address: qa.address }),
  }).then((r) => r.json()).catch(() => null);
  check('POST /api/gas fondea wallet nueva', g?.funded === true, `hash=${g?.hash ?? g?.reason}`);
  if (g?.hash) {
    const t0 = Date.now();
    await pub.waitForTransactionReceipt({ hash: g.hash });
    console.log(`    faucet tx confirmó en ${Date.now() - t0}ms`);
  }
  const monBal = await pub.getBalance({ address: qa.address });
  check('QA tiene MON para gas', monBal > 0n, `${formatUnits(monBal, 18)} MON`);

  // ── 2. Mint de saldo (lo que hace "Cargar saldo" en chain mode) ──
  const ARS_MINT = parseUnits('2000', 18), USDC_MINT = parseUnits('10', 6);
  await tx(wDeployer, 'mint mARS', { address: C.ars, abi: ABIS.ars, functionName: 'mint', args: [qa.address, ARS_MINT] });
  await tx(wDeployer, 'mint mUSDC', { address: C.usdc, abi: ABIS.usdc, functionName: 'mint', args: [qa.address, USDC_MINT] });
  check('Saldo mARS del QA', (await erc20Bal(C.ars, qa.address)) >= ARS_MINT);

  // ── 3. TimeStream: setRate → approve → startStream → stopStream ──
  console.log('\n## TimeStream (Modo 1)');
  const ratePerSec = parseUnits('0.5', 18); // 0.5 ARS/s
  await tx(wDeployer, 'setRate', { address: C.timeStream, abi: ABIS.ts, functionName: 'setRate', args: [ratePerSec, 0] });

  const cap = parseUnits('10', 18);
  await tx(wQa, 'approve TimeStream', { address: C.ars, abi: ABIS.ars, functionName: 'approve', args: [C.timeStream, cap] });
  const s0 = await tx(wQa, 'startStream', { address: C.timeStream, abi: ABIS.ts, functionName: 'startStream', args: [deployer.address, cap, 0, '0x'] });
  let sessionId;
  for (const log of s0.receipt.logs) {
    try {
      const d = decodeEventLog({ abi: ABIS.ts, data: log.data, topics: log.topics });
      if (d.eventName === 'StreamStarted') sessionId = d.args.sessionId;
    } catch { /* skip */ }
  }
  check('StreamStarted emite sessionId', !!sessionId, sessionId);

  await new Promise((r) => setTimeout(r, 2500)); // consumo en vivo
  const balBefore = await erc20Bal(C.ars, qa.address);
  const depBefore = await erc20Bal(C.ars, deployer.address);
  const sStop = await tx(wQa, 'stopStream', { address: C.timeStream, abi: ABIS.ts, functionName: 'stopStream', args: [sessionId] });
  let paid, refunded, dur;
  for (const log of sStop.receipt.logs) {
    try {
      const d = decodeEventLog({ abi: ABIS.ts, data: log.data, topics: log.topics });
      if (d.eventName === 'StreamSettled') ({ totalPaid: paid, refunded, durationSeconds: dur } = d.args);
    } catch { /* skip */ }
  }
  check('StreamSettled con paid/refund', paid !== undefined && refunded !== undefined,
    `paid=${formatUnits(paid ?? 0n, 18)} refund=${formatUnits(refunded ?? 0n, 18)} dur=${dur}s`);
  check('paid + refund == cap (devolución exacta)', paid + refunded === cap);
  const balAfter = await erc20Bal(C.ars, qa.address);
  // startStream escribe el cap entero al contrato; stopStream devuelve el
  // excedente → el delta post-settle del user es exactamente el refund.
  check('QA recibe refund exacto del cap', balAfter - balBefore === refunded);
  check('Comercio acreditado', (await erc20Bal(C.ars, deployer.address)) - depBefore === paid);
  const sess = await pub.readContract({ address: C.timeStream, abi: ABIS.ts, functionName: 'getSession', args: [sessionId] });
  check('Sesión on-chain cerrada (active=false)', sess.active === false);

  // killswitch on-chain
  await tx(wDeployer, 'deactivateQR', { address: C.timeStream, abi: ABIS.ts, functionName: 'deactivateQR' });
  const mState = await pub.readContract({ address: C.timeStream, abi: ABIS.ts, functionName: 'merchants', args: [deployer.address] });
  const mDisabled = Array.isArray(mState) ? mState[2] : mState.disabled;
  check('Killswitch on-chain (disabled=true)', mDisabled === true);
  await tx(wDeployer, 'reactivateQR', { address: C.timeStream, abi: ABIS.ts, functionName: 'reactivateQR' });

  // ── 4. MilestoneEscrow (Modo 2) ──
  console.log('\n## MilestoneEscrow (Modo 2)');
  const total = parseUnits('10', 18), half = total / 2n;
  await tx(wQa, 'approve Escrow', { address: C.ars, abi: ABIS.ars, functionName: 'approve', args: [C.escrow, total] });
  const cp = await tx(wQa, 'createProject (100% upfront)', {
    address: C.escrow, abi: ABIS.esc, functionName: 'createProject',
    args: [deployer.address, '0x0000000000000000000000000000000000000000', 2, 0, 0, ['Etapa 1', 'Etapa 2'], [half, half]],
  });
  let projectId;
  for (const log of cp.receipt.logs) {
    try {
      const d = decodeEventLog({ abi: ABIS.esc, data: log.data, topics: log.topics });
      if (d.eventName === 'ProjectCreated') projectId = d.args.projectId;
    } catch { /* skip */ }
  }
  check('ProjectCreated emite projectId', !!projectId, projectId);
  check('Escrow retiene el 100%', (await erc20Bal(C.ars, C.escrow)) >= total);

  // Regla clave on-chain: cancelar antes de pagar etapa 0 debe revertir
  let cancelReverted = false;
  try {
    await wQa.writeContract({ address: C.escrow, abi: ABIS.esc, functionName: 'cancelProject', args: [projectId] })
      .then((h) => pub.waitForTransactionReceipt({ hash: h }));
  } catch { cancelReverted = true; }
  check('REGLA CLAVE on-chain: cancelProject revierte pre-etapa-1', cancelReverted);

  await tx(wDeployer, 'deliverStage(0)', { address: C.escrow, abi: ABIS.esc, functionName: 'deliverStage', args: [projectId, 0] });
  const depBalPre = await erc20Bal(C.ars, deployer.address);
  await tx(wQa, 'approveStage(0)', { address: C.escrow, abi: ABIS.esc, functionName: 'approveStage', args: [projectId, 0] });
  check('Contratista cobró etapa 1', (await erc20Bal(C.ars, deployer.address)) - depBalPre === half, `${formatUnits(half, 18)} ARS`);

  const qaBalPre = await erc20Bal(C.ars, qa.address);
  const cancel = await tx(wQa, 'cancelProject', { address: C.escrow, abi: ABIS.esc, functionName: 'cancelProject', args: [projectId] });
  let refundEv;
  for (const log of cancel.receipt.logs) {
    try {
      const d = decodeEventLog({ abi: ABIS.esc, data: log.data, topics: log.topics });
      if (d.eventName === 'ProjectCancelled') refundEv = d.args.refunded ?? d.args[1];
    } catch { /* skip */ }
  }
  check('Cancelación post-etapa-1 con reembolso real', (await erc20Bal(C.ars, qa.address)) - qaBalPre === half,
    `refund event=${refundEv ? formatUnits(refundEv, 18) : '?'} ARS`);

  // ── 5. P2P + Exchange ──
  console.log('\n## P2P + Exchange');
  const t = await tx(wQa, 'transfer mUSDC (P2P)', { address: C.usdc, abi: ABIS.usdc, functionName: 'transfer', args: [deployer.address, parseUnits('5', 6)] });
  check('Transferencia ERC-20 real (comprobante=hash)', t.receipt.status === 'success', t.hash);

  const swapAmt = parseUnits('1200', 18); // 1200 ARS → 1 USD @1200
  const usdcPre = await erc20Bal(C.usdc, qa.address);
  await tx(wQa, 'approve Exchange', { address: C.ars, abi: ABIS.ars, functionName: 'approve', args: [C.exchange, swapAmt] });
  try {
    const sw = await tx(wQa, 'swapARSforUSDC', { address: C.exchange, abi: ABIS.ex, functionName: 'swapARSforUSDC', args: [swapAmt] });
    const usdcPost = await erc20Bal(C.usdc, qa.address);
    check('Swap ARS→USD @1200', usdcPost - usdcPre === parseUnits('1', 6), `+${formatUnits(usdcPost - usdcPre, 6)} USD`);
  } catch (e) {
    check('Swap ARS→USD @1200', false, String(e).slice(0, 120));
  }

  console.log(`\n# Latencia txs: avg ${(lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(0)}ms | min ${Math.min(...lat)} | max ${Math.max(...lat)}`);
  console.log(`# RESULTADO: ${pass} PASS / ${fail} FAIL`);
  if (fail) process.exitCode = 1;
}

main().catch((e) => { console.error('SMOKE CRASH:', e.shortMessage ?? e.message ?? e); process.exitCode = 2; });
