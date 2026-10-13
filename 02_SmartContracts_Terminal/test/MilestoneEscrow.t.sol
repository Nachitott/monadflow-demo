// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/tokens/MockUSDC.sol";
import {MockARS} from "../src/tokens/MockARS.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {CurrencyType} from "../src/types/CurrencyType.sol";

contract MilestoneEscrowTest is Test {
    MockUSDC usdc;
    MockARS ars;
    MilestoneEscrow escrow;

    address client = makeAddr("client");
    address contractor = makeAddr("contractor");
    address agent = makeAddr("agent");
    address stranger = makeAddr("stranger");

    uint256 constant STAGE0 = 40e6; // 40 USD
    uint256 constant STAGE1 = 30e6; // 30 USD
    uint256 constant STAGE2 = 30e6; // 30 USD
    uint256 constant TOTAL = 100e6;
    uint32 constant AUTO_DAYS = 5;
    uint32 constant AUTO_SECONDS = AUTO_DAYS * 86400;

    function setUp() public {
        usdc = new MockUSDC();
        ars = new MockARS();
        escrow = new MilestoneEscrow(address(usdc), address(ars));

        usdc.mint(client, 10_000e6);
        ars.mint(client, 10_000_000e18);
        vm.startPrank(client);
        usdc.approve(address(escrow), type(uint256).max);
        ars.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    // ─── Helpers ─────────────────────────────────────────────────

    function _desc() internal pure returns (string[] memory d) {
        d = new string[](3);
        d[0] = "Diseno"; d[1] = "Desarrollo"; d[2] = "Deploy";
    }

    function _amounts() internal pure returns (uint256[] memory a) {
        a = new uint256[](3);
        a[0] = STAGE0; a[1] = STAGE1; a[2] = STAGE2;
    }

    function _create(address agent_) internal returns (bytes32 projectId) {
        vm.prank(client);
        projectId = escrow.createProject(
            contractor, agent_, 3, AUTO_DAYS, CurrencyType.USD, _desc(), _amounts()
        );
    }

    function _deliver(bytes32 pid, uint8 stage) internal {
        vm.prank(contractor);
        escrow.deliverStage(pid, stage);
    }

    function _approve(bytes32 pid, uint8 stage) internal {
        vm.prank(client);
        escrow.approveStage(pid, stage);
    }

    // ─── createProject ───────────────────────────────────────────

    function test_CreateProject() public {
        uint256 clientBefore = usdc.balanceOf(client);

        vm.expectEmit(false, true, true, true); // projectId desconocido → no se chequea
        emit MilestoneEscrow.ProjectCreated(
            bytes32(0), client, contractor, agent, TOTAL, CurrencyType.USD
        );

        bytes32 pid = _create(agent);

        // Depósito 100% congelado
        assertEq(usdc.balanceOf(client), clientBefore - TOTAL);
        assertEq(usdc.balanceOf(address(escrow)), TOTAL);

        MilestoneEscrow.Project memory p = escrow.getProject(pid);
        assertEq(p.client, client);
        assertEq(p.contractor, contractor);
        assertEq(p.agent, agent);
        assertEq(p.totalAmount, TOTAL);
        assertEq(p.totalStages, 3);
        assertEq(p.currentStage, 0);
        assertEq(p.autoReleaseSeconds, AUTO_SECONDS);
        assertEq(uint8(p.status), uint8(MilestoneEscrow.ProjectStatus.Active));

        MilestoneEscrow.Milestone[] memory ms = escrow.getMilestones(pid);
        assertEq(ms.length, 3);
        assertEq(ms[0].amount, STAGE0);
        assertEq(ms[0].deliveredAt, 0);
        assertEq(ms[0].approvedAt, 0);
        assertEq(ms[2].description, "Deploy");

        assertEq(escrow.getClientProjects(client).length, 1);
        assertEq(escrow.getContractorProjects(contractor).length, 1);
    }

    function test_RevertCreateZeroContractor() public {
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        vm.prank(client);
        escrow.createProject(address(0), agent, 3, AUTO_DAYS, CurrencyType.USD, _desc(), _amounts());
    }

    function test_RevertCreateContractorIsClient() public {
        vm.expectRevert(MilestoneEscrow.ContractorIsClient.selector);
        vm.prank(client);
        escrow.createProject(client, agent, 3, AUTO_DAYS, CurrencyType.USD, _desc(), _amounts());
    }

    function test_RevertCreateInvalidStages() public {
        string[] memory descs = _desc();
        uint256[] memory amounts = _amounts();

        // totalStages = 0
        vm.expectRevert(MilestoneEscrow.InvalidStages.selector);
        vm.prank(client);
        escrow.createProject(contractor, agent, 0, AUTO_DAYS, CurrencyType.USD, descs, amounts);

        // largos desalineados
        vm.expectRevert(MilestoneEscrow.InvalidStages.selector);
        vm.prank(client);
        escrow.createProject(contractor, agent, 2, AUTO_DAYS, CurrencyType.USD, descs, amounts);
    }

    function test_RevertCreateZeroStageAmount() public {
        uint256[] memory amounts = _amounts();
        amounts[1] = 0;
        vm.expectRevert(MilestoneEscrow.ZeroStageAmount.selector);
        vm.prank(client);
        escrow.createProject(contractor, agent, 3, AUTO_DAYS, CurrencyType.USD, _desc(), amounts);
    }

    // ─── deliverStage / approveStage ─────────────────────────────

    function test_DeliverApproveFullCycle() public {
        bytes32 pid = _create(agent);

        _deliver(pid, 0);
        vm.expectEmit(true, false, false, true);
        emit MilestoneEscrow.StageApproved(pid, 0, STAGE0);
        _approve(pid, 0);
        assertEq(usdc.balanceOf(contractor), STAGE0);

        _deliver(pid, 1);
        _approve(pid, 1);
        assertEq(usdc.balanceOf(contractor), STAGE0 + STAGE1);

        _deliver(pid, 2);
        vm.expectEmit(true, false, false, true);
        emit MilestoneEscrow.ProjectCompleted(pid);
        _approve(pid, 2);
        assertEq(usdc.balanceOf(contractor), TOTAL);
        assertEq(usdc.balanceOf(address(escrow)), 0);

        MilestoneEscrow.Project memory p = escrow.getProject(pid);
        assertEq(uint8(p.status), uint8(MilestoneEscrow.ProjectStatus.Completed));
        assertEq(p.currentStage, 3);
    }

    function test_RevertDeliverNotContractor() public {
        bytes32 pid = _create(agent);
        vm.expectRevert(MilestoneEscrow.NotContractor.selector);
        vm.prank(client);
        escrow.deliverStage(pid, 0);
    }

    function test_RevertDeliverOutOfOrder() public {
        bytes32 pid = _create(agent);
        vm.expectRevert(MilestoneEscrow.StageOutOfOrder.selector);
        vm.prank(contractor);
        escrow.deliverStage(pid, 1); // salta la etapa 0
    }

    function test_RevertDeliverTwice() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        vm.expectRevert(MilestoneEscrow.StageAlreadyDelivered.selector);
        vm.prank(contractor);
        escrow.deliverStage(pid, 0);
    }

    function test_RevertApproveNotClient() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        vm.expectRevert(MilestoneEscrow.NotClient.selector);
        vm.prank(contractor);
        escrow.approveStage(pid, 0);
    }

    function test_RevertApproveNotDelivered() public {
        bytes32 pid = _create(agent);
        vm.expectRevert(MilestoneEscrow.StageNotDelivered.selector);
        vm.prank(client);
        escrow.approveStage(pid, 0);
    }

    function test_RevertActionsOnUnknownProject() public {
        bytes32 fake = keccak256("inexistente");
        vm.expectRevert(MilestoneEscrow.ProjectNotFound.selector);
        vm.prank(contractor);
        escrow.deliverStage(fake, 0);
    }

    // ─── Etapa 0 intocable / cancelProject ───────────────────────

    function test_CancelRevertsBeforeStage0Paid() public {
        bytes32 pid = _create(agent);
        vm.expectRevert(MilestoneEscrow.StageZeroLocked.selector);
        vm.prank(client);
        escrow.cancelProject(pid);
    }

    function test_CancelRevertsWithStage0DeliveredNotPaid() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0); // entregada pero NO aprobada → sigue intocable
        vm.expectRevert(MilestoneEscrow.StageZeroLocked.selector);
        vm.prank(client);
        escrow.cancelProject(pid);
    }

    function test_CancelAfterStage0RefundsRest() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0); // compromiso sellado

        uint256 clientBefore = usdc.balanceOf(client);
        vm.expectEmit(true, false, false, true);
        emit MilestoneEscrow.ProjectCancelled(pid, STAGE1 + STAGE2);

        vm.prank(client);
        escrow.cancelProject(pid);

        // Cliente recupera etapas 1+2; contratista conserva etapa 0
        assertEq(usdc.balanceOf(client), clientBefore + STAGE1 + STAGE2);
        assertEq(usdc.balanceOf(contractor), STAGE0);
        assertEq(usdc.balanceOf(address(escrow)), 0);

        MilestoneEscrow.Project memory p = escrow.getProject(pid);
        assertEq(uint8(p.status), uint8(MilestoneEscrow.ProjectStatus.Cancelled));
    }

    function test_CancelRefundsDeliveredUnapprovedStage() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1); // etapa 1 entregada pero no aprobada → se reembolsa al cliente

        uint256 clientBefore = usdc.balanceOf(client);
        vm.prank(client);
        escrow.cancelProject(pid);
        assertEq(usdc.balanceOf(client), clientBefore + STAGE1 + STAGE2);
    }

    function test_RevertCancelNotClient() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        vm.expectRevert(MilestoneEscrow.NotClient.selector);
        vm.prank(contractor);
        escrow.cancelProject(pid);
    }

    // ─── Auto-release ────────────────────────────────────────────

    function test_AutoReleaseAfterTimer() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);

        vm.warp(vm.getBlockTimestamp() + AUTO_SECONDS + 1);

        vm.expectEmit(true, false, false, true);
        emit MilestoneEscrow.AutoReleased(pid, 0, STAGE0);
        vm.prank(stranger); // permissionless (keeper/orquestador)
        escrow.claimAutoRelease(pid);

        assertEq(usdc.balanceOf(contractor), STAGE0);
        assertEq(escrow.getProject(pid).currentStage, 1);
    }

    function test_AutoReleaseCompletesProject() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        _approve(pid, 1);
        _deliver(pid, 2);

        vm.warp(vm.getBlockTimestamp() + AUTO_SECONDS + 1);
        vm.prank(stranger);
        escrow.claimAutoRelease(pid);

        assertEq(usdc.balanceOf(contractor), TOTAL);
        assertEq(uint8(escrow.getProject(pid).status), uint8(MilestoneEscrow.ProjectStatus.Completed));
    }

    function test_RevertAutoReleaseNotDue() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        vm.warp(vm.getBlockTimestamp() + AUTO_SECONDS - 1); // 1s antes del vencimiento
        vm.expectRevert(MilestoneEscrow.AutoReleaseNotDue.selector);
        escrow.claimAutoRelease(pid);
    }

    function test_RevertAutoReleaseNotDelivered() public {
        bytes32 pid = _create(agent);
        vm.warp(vm.getBlockTimestamp() + AUTO_SECONDS + 1);
        vm.expectRevert(MilestoneEscrow.StageNotDelivered.selector);
        escrow.claimAutoRelease(pid);
    }

    function test_RevertAutoReleaseDisabled() public {
        // Proyecto con timer 0 → auto-release deshabilitado
        vm.prank(client);
        bytes32 pid = escrow.createProject(
            contractor, agent, 3, 0, CurrencyType.USD, _desc(), _amounts()
        );
        _deliver(pid, 0);
        vm.warp(vm.getBlockTimestamp() + 365 days);
        vm.expectRevert(MilestoneEscrow.AutoReleaseDisabled.selector);
        escrow.claimAutoRelease(pid);
    }

    // ─── Disputas ────────────────────────────────────────────────

    function test_DisputeResolveByAgent() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);

        vm.expectEmit(true, false, true, true);
        emit MilestoneEscrow.ProjectDisputed(pid, 1, client);
        vm.prank(client);
        escrow.disputeStage(pid, 1);

        assertEq(uint8(escrow.getProject(pid).status), uint8(MilestoneEscrow.ProjectStatus.Disputed));

        // Agent resuelve: 60% contractor / 40% client
        uint256 contractorBefore = usdc.balanceOf(contractor);
        uint256 clientBefore = usdc.balanceOf(client);
        vm.expectEmit(true, false, false, true);
        emit MilestoneEscrow.DisputeResolved(pid, 1, (STAGE1 * 6000) / 10_000, STAGE1 - (STAGE1 * 6000) / 10_000);
        vm.prank(agent);
        escrow.resolveDispute(pid, 1, 6000);

        assertEq(usdc.balanceOf(contractor), contractorBefore + (STAGE1 * 6000) / 10_000);
        assertEq(usdc.balanceOf(client), clientBefore + STAGE1 - (STAGE1 * 6000) / 10_000);
        assertEq(uint8(escrow.getProject(pid).status), uint8(MilestoneEscrow.ProjectStatus.Active));
        assertEq(escrow.getProject(pid).currentStage, 2);
    }

    function test_DisputeResolveZeroShareToContractor() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);

        vm.prank(contractor);
        escrow.disputeStage(pid, 1);

        uint256 clientBefore = usdc.balanceOf(client);
        vm.prank(agent);
        escrow.resolveDispute(pid, 1, 0); // todo para el cliente

        assertEq(usdc.balanceOf(client), clientBefore + STAGE1);
    }

    function test_DisputeResolveLastStageCompletes() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        _approve(pid, 1);
        _deliver(pid, 2);

        vm.prank(client);
        escrow.disputeStage(pid, 2);

        vm.prank(agent);
        escrow.resolveDispute(pid, 2, 10_000); // todo al contratista → proyecto completo

        assertEq(usdc.balanceOf(contractor), TOTAL);
        assertEq(uint8(escrow.getProject(pid).status), uint8(MilestoneEscrow.ProjectStatus.Completed));
    }

    function test_DisputeBlocksActions() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        vm.prank(client);
        escrow.disputeStage(pid, 1);

        vm.warp(vm.getBlockTimestamp() + AUTO_SECONDS + 1);

        vm.expectRevert(MilestoneEscrow.ProjectNotActive.selector);
        vm.prank(client);
        escrow.approveStage(pid, 1);
        vm.expectRevert(MilestoneEscrow.ProjectNotActive.selector);
        vm.prank(client);
        escrow.cancelProject(pid);
        vm.expectRevert(MilestoneEscrow.ProjectNotActive.selector);
        escrow.claimAutoRelease(pid);
        vm.expectRevert(MilestoneEscrow.ProjectNotActive.selector);
        vm.prank(contractor);
        escrow.deliverStage(pid, 2);
    }

    function test_RevertDisputeNoAgent() public {
        bytes32 pid = _create(address(0)); // sin árbitro
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        vm.expectRevert(MilestoneEscrow.NoAgentSet.selector);
        vm.prank(client);
        escrow.disputeStage(pid, 1);
    }

    function test_RevertDisputeStage0() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0); // etapa 0 entregada: es intocable, no dispunable
        vm.expectRevert(MilestoneEscrow.InvalidStage.selector);
        vm.prank(client);
        escrow.disputeStage(pid, 0);
    }

    function test_RevertDisputeNotDelivered() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        // etapa 1 sin entregar
        vm.expectRevert(MilestoneEscrow.StageNotDelivered.selector);
        vm.prank(client);
        escrow.disputeStage(pid, 1);
    }

    function test_RevertDisputeNotParty() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        vm.expectRevert(MilestoneEscrow.NotParty.selector);
        vm.prank(stranger);
        escrow.disputeStage(pid, 1);
    }

    function test_RevertResolveNotAgent() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        vm.prank(client);
        escrow.disputeStage(pid, 1);

        vm.expectRevert(MilestoneEscrow.NotAgent.selector);
        vm.prank(client); // el cliente no es el agent
        escrow.resolveDispute(pid, 1, 5000);
    }

    function test_RevertResolveNotDisputed() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        vm.expectRevert(MilestoneEscrow.ProjectNotDisputed.selector);
        vm.prank(agent);
        escrow.resolveDispute(pid, 0, 5000);
    }

    function test_RevertResolveShareBpsOver10000() public {
        bytes32 pid = _create(agent);
        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        vm.prank(client);
        escrow.disputeStage(pid, 1);

        vm.expectRevert(MilestoneEscrow.InvalidShareBps.selector);
        vm.prank(agent);
        escrow.resolveDispute(pid, 1, 10_001);
    }

    // ─── ARS end-to-end ──────────────────────────────────────────

    function test_FullCycleInARS() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50_000e18;
        amounts[1] = 50_000e18;
        string[] memory descs = new string[](2);
        descs[0] = "Etapa 1"; descs[1] = "Etapa 2";

        vm.prank(client);
        bytes32 pid = escrow.createProject(
            contractor, agent, 2, 0, CurrencyType.ARS, descs, amounts
        );

        _deliver(pid, 0);
        _approve(pid, 0);
        _deliver(pid, 1);
        _approve(pid, 1);

        assertEq(ars.balanceOf(contractor), 100_000e18);
        assertEq(uint8(escrow.getProject(pid).status), uint8(MilestoneEscrow.ProjectStatus.Completed));
    }
}
