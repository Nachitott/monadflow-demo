#!/usr/bin/env bash
# Exporta las ABIs compiladas de los 5 contratos a 02_SmartContracts_Terminal/ABIs/
# para consumo del frontend (viem/wagmi) y del futuro Agente Orquestador.
# Uso (Git Bash / WSL):  bash script/export-abis.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# Asegura artefactos frescos en out/
forge build --silent

mkdir -p ABIs

declare -A CONTRACTS=(
  [MockUSDC]="src/tokens/MockUSDC.sol"
  [MockARS]="src/tokens/MockARS.sol"
  [MockExchange]="src/MockExchange.sol"
  [TimeStream]="src/TimeStream.sol"
  [MilestoneEscrow]="src/MilestoneEscrow.sol"
)

for name in "${!CONTRACTS[@]}"; do
  forge inspect "${CONTRACTS[$name]}:${name}" abi --json > "ABIs/${name}.json"
  echo "ABI exportada -> ABIs/${name}.json"
done

echo "Listo: $(ls ABIs/*.json | wc -l) ABIs en ABIs/"
