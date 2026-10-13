// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/tokens/MockUSDC.sol";
import {MockARS} from "../src/tokens/MockARS.sol";
import {MockExchange} from "../src/MockExchange.sol";
import {TimeStream} from "../src/TimeStream.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

/// @notice Deploy completo de MonadFlow a Monad Testnet (chain 10143).
/// @dev Uso:
///        PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy \
///          --rpc-url monad_testnet --broadcast --verify
///      Env vars:
///        PRIVATE_KEY   (requerida) — deployer con MON del faucet https://faucet.monad.xyz
///        ARS_PER_USD   (opcional)  — rate inicial del MockExchange, escala 1e18
///                                  (default: 1200e18 = 1 USD ↔ 1200 ARS)
///      Tras el deploy, registrar las direcciones en
///      `04_Deploy_and_Networks/Contract_Addresses.md` y exportar ABIs con
///      `script/export-abis.sh`.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 arsPerUsd = vm.envOr("ARS_PER_USD", uint256(1200e18));

        vm.startBroadcast(deployerKey);

        // 1. Capa de moneda
        MockUSDC usdc = new MockUSDC();
        MockARS ars = new MockARS();
        MockExchange exchange = new MockExchange(address(usdc), address(ars), arsPerUsd);

        // 2. Contratos de negocio (account-agnostic: operan sobre msg.sender = Smart Account)
        TimeStream timeStream = new TimeStream(address(usdc), address(ars));
        MilestoneEscrow escrow = new MilestoneEscrow(address(usdc), address(ars));

        vm.stopBroadcast();

        console.log("=== MonadFlow deploy (Monad Testnet 10143) ===");
        console.log("MockUSDC       :", address(usdc));
        console.log("MockARS        :", address(ars));
        console.log("MockExchange   :", address(exchange));
        console.log("TimeStream     :", address(timeStream));
        console.log("MilestoneEscrow:", address(escrow));
        console.log("arsPerUsd      :", arsPerUsd);
        console.log("Owner Exchange :", exchange.owner());
    }
}
