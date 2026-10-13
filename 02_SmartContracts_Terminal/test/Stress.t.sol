// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/tokens/MockUSDC.sol";
import {MockARS} from "../src/tokens/MockARS.sol";
import {TimeStream} from "../src/TimeStream.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {CurrencyType} from "../src/types/CurrencyType.sol";

/// @notice Pruebas de carga: múltiples comercios, sesiones y proyectos concurrentes.
/// @dev Verifica el diseño Parallel-EVM del spec §4: mappings aislados por bytes32 —
///      ninguna sesión/proyecto contamina el estado de otro y la liquidación es exacta.
contract StressTest is Test {
    MockUSDC usdc;
    MockARS ars;
    TimeStream timeStream;
    MilestoneEscrow escrow;

    address client = makeAddr("client");
    address contractor = makeAddr("contractor");
    address agent = makeAddr("agent");
    address stranger = makeAddr("stranger");
    address merchant = makeAddr("merchant");

    uint256 constant RATE = 1e4; // 0.01 USD/s
    uint256 constant STAGE = 10e6;
    uint32 constant AUTO_SECONDS = 5 * 86400;

    function setUp() public {
        usdc = new MockUSDC();
        ars = new MockARS();
        timeStream = new TimeStream(address(usdc), address(ars));
        escrow = new MilestoneEscrow(address(usdc), address(ars));

        vm.prank(merchant);
        timeStream.setRate(RATE, CurrencyType.USD);

        usdc.mint(client, 10_000_000e6);
        ars.mint(client, 10_000_000e18);
        vm.startPrank(client);
        usdc.approve(address(escrow), type(uint256).max);
        ars.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    // ─── Streams concurrentes ────────────────────────────────────

    /// @dev 5 comercios × 8 usuarios = 40 sesiones activas simultáneas con duraciones
    ///      distintas. Verifica que cada liquidación sea min(duración × rate, cap) y
    ///      que no haya contaminación de estado entre comercios ni usuarios.
    function test_StressConcurrentStreams() public {
        uint256 M = 5;
        uint256 N = 8;
        uint256 total = M * N;

        address[] memory merchants = new address[](M);
        uint256[] memory rates = new uint256[](M);
        for (uint256 i; i < M; i++) {
            merchants[i] = makeAddr(string.concat("merchant-", vm.toString(i)));
            rates[i] = (i + 1) * 1e3; // 1e3..5e3 unidades/s — tarifas distintas por comercio
            vm.prank(merchants[i]);
            timeStream.setRate(rates[i], CurrencyType.USD);
        }

        bytes32[] memory ids = new bytes32[](total);
        address[] memory users = new address[](total);
        address[] memory mOf = new address[](total);
        uint256[] memory caps = new uint256[](total);
        uint256[] memory startTs = new uint256[](total);
        uint256[] memory rateOf = new uint256[](total);

        // Arranques escalonados → duraciones distintas al cierre
        for (uint256 i; i < total; i++) {
            address u = makeAddr(string.concat("user-", vm.toString(i)));
            address m = merchants[i % M];
            uint256 cap = ((i % 7) + 5) * 1e6; // 5..11 USD

            usdc.mint(u, cap);
            vm.prank(u);
            usdc.approve(address(timeStream), cap);

            vm.prank(u);
            ids[i] = timeStream.startStream(m, cap, CurrencyType.USD, "");
            users[i] = u;
            mOf[i] = m;
            caps[i] = cap;
            rateOf[i] = rates[i % M];
            startTs[i] = block.timestamp;

            vm.warp(vm.getBlockTimestamp() + ((i % 5) + 1) * 60); // +60..300s entre starts
        }

        // Cierre masivo: todos activos hasta acá
        for (uint256 i; i < total; i++) {
            uint256 dur = block.timestamp - startTs[i];
            uint256 owed = dur * rateOf[i];
            uint256 expected = owed > caps[i] ? caps[i] : owed;

            // mitad los cierra el usuario, mitad el comercio — ambos caminos
            address caller = (i % 2 == 0) ? users[i] : mOf[i];
            // si cap agotado y caller es "tercero"... usamos dueño/merchant que siempre pueden
            vm.prank(caller);
            uint256 paid = timeStream.stopStream(ids[i]);
            assertEq(paid, expected, "pago incorrecto en sesion");

            TimeStream.StreamSession memory s = timeStream.getSession(ids[i]);
            assertFalse(s.active);
            assertEq(s.totalPaid, expected);
        }

        // Invariantes globales: contrato drenado, suma cobrada == suma esperada
        assertEq(usdc.balanceOf(address(timeStream)), 0);

        for (uint256 i; i < M; i++) {
            uint256 expectedEarn;
            for (uint256 j; j < total; j++) {
                if (mOf[j] == merchants[i]) {
                    uint256 dur = block.timestamp - startTs[j];
                    uint256 owed = dur * rateOf[j];
                    expectedEarn += owed > caps[j] ? caps[j] : owed;
                }
            }
            assertEq(usdc.balanceOf(merchants[i]), expectedEarn, "cobro incorrecto comercio");
        }

        for (uint256 i; i < total; i++) {
            uint256 dur = block.timestamp - startTs[i];
            uint256 owed = dur * rateOf[i];
            uint256 expectedPaid = owed > caps[i] ? caps[i] : owed;
            // usuario depositó `cap` y recibió cap - paid
            assertEq(usdc.balanceOf(users[i]), caps[i] - expectedPaid, "refund incorrecto");
        }
    }

    // ─── Proyectos concurrentes ──────────────────────────────────

    function _desc() internal pure returns (string[] memory d) {
        d = new string[](3);
        d[0] = "A"; d[1] = "B"; d[2] = "C";
    }

    function _amounts(uint256 unit) internal pure returns (uint256[] memory a) {
        a = new uint256[](3);
        a[0] = 4 * unit; a[1] = 3 * unit; a[2] = 3 * unit;
    }

    /// @dev 12 proyectos simultáneos por 4 caminos de vida distintos:
    ///      completo, cancelado, disputa resuelta, auto-release.
    ///      Verifica balances agregados: contractor cobró exactamente lo liquidado.
    function test_StressConcurrentProjects() public {
        uint256 P = 12;
        bytes32[] memory pids = new bytes32[](P);

        for (uint256 i; i < P; i++) {
            // proyectos de índice par llevan agent (necesario para el camino disputa)
            address ag = (i % 2 == 0) ? agent : address(0);
            vm.prank(client);
            pids[i] = escrow.createProject(
                contractor, ag, 3, 5, CurrencyType.USD, _desc(), _amounts(STAGE)
            );
        }

        uint256 expectedContractor = 0;
        uint256 expectedClientRefund = 0;

        for (uint256 i; i < P; i++) {
            bytes32 pid = pids[i];
            uint256 path = i % 4;

            if (path == 0) {
                // Ciclo completo
                for (uint8 s; s < 3; s++) {
                    vm.prank(contractor);
                    escrow.deliverStage(pid, s);
                    vm.prank(client);
                    escrow.approveStage(pid, s);
                    expectedContractor += _amounts(STAGE)[s];
                }
            } else if (path == 1) {
                // Etapa 0 aprobada → cancel: refund etapas 1+2
                vm.prank(contractor);
                escrow.deliverStage(pid, 0);
                vm.prank(client);
                escrow.approveStage(pid, 0);
                expectedContractor += 4 * STAGE;
                vm.prank(client);
                escrow.cancelProject(pid);
                expectedClientRefund += 6 * STAGE;
            } else if (path == 2) {
                // Disputa etapa 1 → agent resuelve 50/50 → sigue Active
                vm.prank(contractor);
                escrow.deliverStage(pid, 0);
                vm.prank(client);
                escrow.approveStage(pid, 0);
                expectedContractor += 4 * STAGE;
                vm.prank(contractor);
                escrow.deliverStage(pid, 1);
                vm.prank(client);
                escrow.disputeStage(pid, 1);
                vm.prank(agent);
                escrow.resolveDispute(pid, 1, 5000);
                expectedContractor += (3 * STAGE) / 2;
                expectedClientRefund += (3 * STAGE) / 2;
            } else {
                // Auto-release de etapa 0 tras el timer
                vm.prank(contractor);
                escrow.deliverStage(pid, 0);
                vm.warp(vm.getBlockTimestamp() + AUTO_SECONDS + 1);
                vm.prank(stranger); // keeper permissionless
                escrow.claimAutoRelease(pid);
                expectedContractor += 4 * STAGE;
            }
        }

        assertEq(usdc.balanceOf(contractor), expectedContractor, "cobro contractor incorrecto");
        // client depositó 12 × 10 STAGE; recibió refunds esperados
        assertEq(
            usdc.balanceOf(client),
            10_000_000e6 - (P * 10 * STAGE) + expectedClientRefund,
            "refund cliente incorrecto"
        );
        // el resto sigue custodiado en el escrow
        assertEq(
            usdc.balanceOf(address(escrow)),
            (P * 10 * STAGE) - expectedContractor - expectedClientRefund
        );
    }

    // ─── Propiedades (fuzz) ──────────────────────────────────────

    /// @dev Propiedad: la liquidación siempre es min(duración × rate, cap).
    function testFuzz_SettleMathMatchesSpec(uint256 duration, uint256 cap) public {
        duration = bound(duration, 0, 365 days);
        cap = bound(cap, 1, 1_000_000e6);

        address u = makeAddr("fuzz-user");
        usdc.mint(u, cap);
        vm.prank(u);
        usdc.approve(address(timeStream), cap);
        vm.prank(u);
        bytes32 sid = timeStream.startStream(merchant, cap, CurrencyType.USD, "");

        vm.warp(vm.getBlockTimestamp() + duration);
        vm.prank(u);
        uint256 paid = timeStream.stopStream(sid);

        uint256 owed = duration * RATE;
        assertEq(paid, owed > cap ? cap : owed);
    }

    /// @dev Propiedad: resolveDispute reparte exactamente shareBps/10000.
    function testFuzz_DisputeShareSplitsExact(uint16 bps) public {
        bps = uint16(bound(bps, 0, 10_000));

        vm.prank(client);
        bytes32 pid = escrow.createProject(
            contractor, agent, 3, 5, CurrencyType.USD, _desc(), _amounts(STAGE)
        );

        vm.prank(contractor);
        escrow.deliverStage(pid, 0);
        vm.prank(client);
        escrow.approveStage(pid, 0);
        vm.prank(contractor);
        escrow.deliverStage(pid, 1);
        vm.prank(client);
        escrow.disputeStage(pid, 1);

        uint256 contractorBefore = usdc.balanceOf(contractor);
        uint256 clientBefore = usdc.balanceOf(client);

        vm.prank(agent);
        escrow.resolveDispute(pid, 1, bps);

        uint256 expectedShare = (3 * STAGE * bps) / 10_000;
        assertEq(usdc.balanceOf(contractor) - contractorBefore, expectedShare);
        assertEq(usdc.balanceOf(client) - clientBefore, 3 * STAGE - expectedShare);
    }

    /// @dev Propiedad: el escrow nunca paga más que el depósito total del proyecto.
    function testFuzz_EscrowNeverOverpays(uint8 stageCount) public {
        stageCount = uint8(bound(stageCount, 1, 20));

        string[] memory d = new string[](stageCount);
        uint256[] memory a = new uint256[](stageCount);
        for (uint256 i; i < stageCount; i++) {
            d[i] = "s";
            a[i] = STAGE;
        }
        vm.prank(client);
        bytes32 pid = escrow.createProject(
            contractor, agent, stageCount, 5, CurrencyType.USD, d, a
        );

        // ciclo completo
        for (uint8 s; s < stageCount; s++) {
            vm.prank(contractor);
            escrow.deliverStage(pid, s);
            vm.prank(client);
            escrow.approveStage(pid, s);
        }
        assertEq(usdc.balanceOf(contractor), uint256(stageCount) * STAGE);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
