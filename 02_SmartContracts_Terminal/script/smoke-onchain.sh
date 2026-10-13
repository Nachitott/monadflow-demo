#!/usr/bin/env bash
# Smoke on-chain MonadFlow — evidencia F3 (TASK_BACKLOG_DEMO)
# Uso:  CAST=~/.foundry/bin/cast.exe bash script/smoke-onchain.sh 2>&1 | tee test_logs/<fecha>.log
#
# Lee estado de los 5 contratos deployados y ejecuta un ciclo real de escritura en
# TimeStream (mint -> approve -> startStream -> accrual -> stopStream) firmado con la
# PRIVATE_KEY del .env local (solo se loguea la address derivada, nunca la key).
set -euo pipefail

CAST="${CAST:-cast}"
RPC="${RPC:-https://testnet-rpc.monad.xyz}"

USDC=0x27BE5512a477045EF270EE16c804776D6269663C
MARS=0x1569b7c9115DF4AFeE1C71689D8E390bceea4958
XCH=0x1C87797a412519BbB4AB62e29E24D2530E200026
TS=0xE3209E6b0CC93BCBc05067956ACd1Cf1ec8118C8
ESC=0xA8f6Fc4a96AD87B4ac4f93cE6F05F9e208d6d817

if [ -f .env ]; then set -a; source .env; set +a; fi
DEPLOYER=$($CAST wallet address --private-key "${PRIVATE_KEY:?definir PRIVATE_KEY en .env}")

say()  { printf '\n=== %s ===\n' "$1"; }
call() { echo "+ cast call $*"; $CAST call "$@" --rpc-url "$RPC"; }
send() { echo "+ cast send $*  (key redacted)"; $CAST send "$@" --private-key "$PRIVATE_KEY" --rpc-url "$RPC"; }
last_of_array() { tr -d '[]\n ' | tr ',' '\n' | grep . | tail -1; }

say "0) Entorno"
$CAST --version
echo "RPC: $RPC"
echo "chain-id: $($CAST chain-id --rpc-url $RPC)"
echo "block:    $($CAST block-number --rpc-url $RPC)"
echo "deployer: $DEPLOYER"
echo "balance deployer (wei): $($CAST balance $DEPLOYER --rpc-url $RPC)"

say "1) Bytecode presente en las 5 direcciones"
for pair in "MockUSDC $USDC" "MockARS $MARS" "MockExchange $XCH" "TimeStream $TS" "MilestoneEscrow $ESC"; do
  set -- $pair
  len=$($CAST code "$2" --rpc-url "$RPC" | tr -d '[:space:]' | wc -c)
  echo "$1 $2 -> bytecode ${len} chars hex $([ "$len" -gt 2 ] && echo OK || echo MISSING)"
done

say "2) Capa de moneda (lecturas)"
call $USDC "name()(string)"
call $USDC "symbol()(string)"
call $USDC "decimals()(uint8)"
call $MARS "name()(string)"
call $MARS "symbol()(string)"
call $MARS "decimals()(uint8)"
call $XCH  "arsPerUsd()(uint256)"
call $XCH  "owner()(address)"

say "3) Estado previo on-chain (evidencia smokes anteriores)"
call $TS  "merchants(address)(uint256,uint8,bool)" $DEPLOYER
PREV_SESSION=$(call $TS "getMerchantSessions(address)(bytes32[])" $DEPLOYER | tail -1 | last_of_array)
call $TS  "getUserSessions(address)(bytes32[])" $DEPLOYER
call $TS  "getSession(bytes32)(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint8,bool)" "$PREV_SESSION"
PREV_PROJECT=$(call $ESC "getClientProjects(address)(bytes32[])" $DEPLOYER | tail -1 | last_of_array)
call $ESC "getProject(bytes32)(bytes32,address,address,address,uint256,uint8,uint8,uint8,uint32,uint256,uint8)" "$PREV_PROJECT"
call $ESC "getMilestones(bytes32)((string,uint256,uint256,uint256)[])" "$PREV_PROJECT"

say "4) Escritura end-to-end: ciclo TimeStream en ARS"
echo "+ MockARS.mint(deployer, 100e18)  — faucet demo"
send $MARS "mint(address,uint256)" $DEPLOYER 100000000000000000000
echo "+ MockARS.approve(TimeStream, 10e18) — autoriza escrow del cap"
send $MARS "approve(address,uint256)" $TS 10000000000000000000
echo "+ TimeStream.startStream(deployer, cap=10e18, currency=ARS(0), voucher=0x)"
send $TS "startStream(address,uint256,uint8,bytes)" $DEPLOYER 10000000000000000000 0 0x
SESSION=$($CAST call $TS "getUserSessions(address)(bytes32[])" $DEPLOYER --rpc-url "$RPC" | last_of_array)
echo "sessionId: $SESSION"
echo "esperando ~4s para acumular..."
sleep 4
call $TS "accruedAmount(bytes32)(uint256)" "$SESSION"
echo "+ TimeStream.stopStream(sessionId) — liquida y devuelve sobrante"
send $TS "stopStream(bytes32)" "$SESSION"

say "5) Estado post-cierre"
call $TS "getSession(bytes32)(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint8,bool)" "$SESSION"
call $MARS "balanceOf(address)(uint256)" $DEPLOYER
call $MARS "balanceOf(address)(uint256)" $TS

say "SMOKE COMPLETO — los tx hashes de arriba son la evidencia 'funciona de verdad'"
