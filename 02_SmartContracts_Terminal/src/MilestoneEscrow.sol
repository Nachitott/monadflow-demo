// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CurrencyType} from "./types/CurrencyType.sol";

/// @notice Modo 2 — Cobro Garantizado por Etapas (Milestone-Lock Escrow).
/// @dev Custodia con depósito del 100% upfront, liberación por etapas en 1-clic,
///      auto-aprobación por temporizador (opcional), disputas con árbitro opcional
///      y política de ETAPA 0 INTOCABLE: el proyecto no puede cancelarse ni disputarse
///      hasta que la primera fracción haya sido pagada al contratista.
///      Optimización Monad Parallel EVM: mappings aislados por bytes32, sin acumuladores globales.
///      Account-agnostic: opera sobre `msg.sender` (Smart Account ERC-4337); sin validación
///      de firmas de usuario. El rol `agent` es el hook del futuro Agente Orquestador.
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Tipos ───────────────────────────────────────────────────

    enum ProjectStatus { Active, Completed, Cancelled, Disputed }

    struct Milestone {
        string description;
        uint256 amount;
        uint256 deliveredAt; // 0 = no entregado; al marcarse arranca el timer de auto-release
        uint256 approvedAt;  // 0 = no liquidado (aprobado, auto-liberado o resuelto)
    }

    struct Project {
        bytes32 id;
        address client;
        address contractor;
        address agent;            // árbitro opcional; address(0) = sin agente → sin disputas on-chain
        uint256 totalAmount;
        CurrencyType currency;
        uint8 totalStages;
        uint8 currentStage;
        uint32 autoReleaseSeconds; // autoReleaseDays * 86400; 0 = timer deshabilitado
        uint256 createdAt;
        ProjectStatus status;
    }

    // ─── Estado ──────────────────────────────────────────────────

    IERC20 public immutable usdcToken;
    IERC20 public immutable arsToken;

    mapping(bytes32 => Project) public projects;
    mapping(bytes32 => Milestone[]) public projectMilestones;
    mapping(address => bytes32[]) public clientProjects;
    mapping(address => bytes32[]) public contractorProjects;

    uint256 private nonce; // derivación de projectId único

    // ─── Eventos (indexed en actor + id — listener-friendly) ─────

    event ProjectCreated(
        bytes32 indexed projectId,
        address indexed client,
        address indexed contractor,
        address agent,
        uint256 totalAmount,
        CurrencyType currency
    );
    event StageDelivered(bytes32 indexed projectId, uint8 stageIndex, uint256 deliveredAt);
    event StageApproved(bytes32 indexed projectId, uint8 stageIndex, uint256 amountPaid);
    event ProjectDisputed(bytes32 indexed projectId, uint8 stageIndex, address indexed raisedBy);
    event DisputeResolved(bytes32 indexed projectId, uint8 stageIndex, uint256 contractorPaid, uint256 clientRefunded);
    event ProjectCancelled(bytes32 indexed projectId, uint256 refundedAmount);
    event AutoReleased(bytes32 indexed projectId, uint8 stageIndex, uint256 amountPaid);
    event ProjectCompleted(bytes32 indexed projectId);

    // ─── Errores ─────────────────────────────────────────────────

    error ZeroAddress();
    error ContractorIsClient();
    error InvalidStages();        // totalStages == 0 o arrays de largo distinto
    error ZeroStageAmount();
    error ProjectNotFound();
    error ProjectNotActive();
    error ProjectNotDisputed();
    error NotClient();
    error NotContractor();
    error NotParty();
    error NotAgent();
    error InvalidStage();         // stageIndex fuera de rango o == 0 en disputa
    error StageOutOfOrder();      // stageIndex != currentStage
    error StageNotDelivered();
    error StageAlreadyDelivered();
    error StageAlreadyApproved();
    error StageZeroLocked();      // cancel antes de liberar la etapa 0 (compromiso sellado)
    error NoAgentSet();
    error InvalidShareBps();
    error AutoReleaseDisabled();
    error AutoReleaseNotDue();

    // ─── Constructor ─────────────────────────────────────────────

    constructor(address _usdcToken, address _arsToken) {
        if (_usdcToken == address(0) || _arsToken == address(0)) revert ZeroAddress();
        usdcToken = IERC20(_usdcToken);
        arsToken = IERC20(_arsToken);
    }

    // ─── Creación ────────────────────────────────────────────────

    /// @notice Crea un acuerdo y congela el 100% del monto en custodia.
    /// @param contractor Trabajador que cobrará por etapas.
    /// @param agent      Árbitro opcional (address(0) = sin disputas on-chain).
    /// @param autoReleaseDays Plazo de auto-aprobación tras cada entrega (0 = deshabilitado).
    function createProject(
        address contractor,
        address agent,
        uint8 totalStages,
        uint32 autoReleaseDays,
        CurrencyType currency,
        string[] calldata stageDescriptions,
        uint256[] calldata stageAmounts
    ) external nonReentrant returns (bytes32 projectId) {
        if (contractor == address(0)) revert ZeroAddress();
        if (contractor == msg.sender) revert ContractorIsClient();
        if (
            totalStages == 0
            || stageDescriptions.length != totalStages
            || stageAmounts.length != totalStages
        ) revert InvalidStages();

        uint256 total = 0;
        for (uint8 i; i < totalStages; i++) {
            // forge-lint: disable-next-line(require-revert-in-loop) — loop acotado por totalStages <= 255
            if (stageAmounts[i] == 0) revert ZeroStageAmount();
            total += stageAmounts[i];
        }

        // forge-lint: disable-next-line(weak-prng) — ID único por nonce+timestamp, no es RNG de seguridad
        projectId = keccak256(abi.encode(msg.sender, contractor, nonce++, block.timestamp));

        Project storage p = projects[projectId];
        p.id = projectId;
        p.client = msg.sender;
        p.contractor = contractor;
        p.agent = agent;
        p.totalAmount = total;
        p.currency = currency;
        p.totalStages = totalStages;
        p.autoReleaseSeconds = autoReleaseDays * 86400;
        p.createdAt = block.timestamp;
        p.status = ProjectStatus.Active;

        Milestone[] storage ms = projectMilestones[projectId];
        for (uint8 i; i < totalStages; i++) {
            ms.push(Milestone({description: stageDescriptions[i], amount: stageAmounts[i], deliveredAt: 0, approvedAt: 0}));
        }

        clientProjects[msg.sender].push(projectId);
        contractorProjects[contractor].push(projectId);

        emit ProjectCreated(projectId, msg.sender, contractor, agent, total, currency);

        _currencyToken(currency).safeTransferFrom(msg.sender, address(this), total);
    }

    // ─── Ciclo de etapas ─────────────────────────────────────────

    /// @notice El contratista marca una etapa como entregada → arranca el timer del cliente.
    /// @dev Entrega secuencial: solo `stageIndex == currentStage` (timer y disputa inequívocos).
    function deliverStage(bytes32 projectId, uint8 stageIndex) external {
        Project storage p = _activeProject(projectId);
        if (msg.sender != p.contractor) revert NotContractor();
        if (stageIndex != p.currentStage) revert StageOutOfOrder();

        Milestone storage m = projectMilestones[projectId][stageIndex];
        if (m.deliveredAt != 0) revert StageAlreadyDelivered();

        m.deliveredAt = block.timestamp;
        emit StageDelivered(projectId, stageIndex, block.timestamp);
    }

    /// @notice El cliente aprueba en 1-clic: libera la fracción al contratista.
    ///         Liberar la etapa 0 sella el compromiso → habilita cancelProject y disputeStage.
    function approveStage(bytes32 projectId, uint8 stageIndex) external nonReentrant {
        Project storage p = _activeProject(projectId);
        if (msg.sender != p.client) revert NotClient();
        if (stageIndex != p.currentStage) revert StageOutOfOrder();

        Milestone storage m = projectMilestones[projectId][stageIndex];
        if (m.deliveredAt == 0) revert StageNotDelivered();
        if (m.approvedAt != 0) revert StageAlreadyApproved();

        m.approvedAt = block.timestamp;
        p.currentStage++;
        if (p.currentStage == p.totalStages) p.status = ProjectStatus.Completed;

        emit StageApproved(projectId, stageIndex, m.amount);
        if (p.status == ProjectStatus.Completed) emit ProjectCompleted(projectId);

        _currencyToken(p.currency).safeTransfer(p.contractor, m.amount);
    }

    /// @notice Auto-aprobación: libera la etapa actual si venció el timer sin respuesta.
    /// @dev Permissionless (keeper-friendly: el orquestador o cualquiera puede ejecutarlo).
    ///      Requiere timer habilitado (`autoReleaseSeconds > 0`) y etapa entregada.
    function claimAutoRelease(bytes32 projectId) external nonReentrant {
        Project storage p = _activeProject(projectId);
        if (p.autoReleaseSeconds == 0) revert AutoReleaseDisabled();

        uint8 stageIndex = p.currentStage;
        Milestone storage m = projectMilestones[projectId][stageIndex];
        if (m.deliveredAt == 0) revert StageNotDelivered();
        if (block.timestamp < m.deliveredAt + p.autoReleaseSeconds) revert AutoReleaseNotDue();

        m.approvedAt = block.timestamp;
        p.currentStage++;
        if (p.currentStage == p.totalStages) p.status = ProjectStatus.Completed;

        emit AutoReleased(projectId, stageIndex, m.amount);
        if (p.status == ProjectStatus.Completed) emit ProjectCompleted(projectId);

        _currencyToken(p.currency).safeTransfer(p.contractor, m.amount);
    }

    // ─── Cancelación (política Etapa 0 intocable) ────────────────

    /// @notice Cancela el acuerdo y reembolsa el 100% de las etapas no liquidadas al cliente.
    /// @dev REVERT si `milestones[0].approvedAt == 0` — una vez pactado el trabajo, la primera
    ///      fracción queda comprometida para el contratista. Etapas entregadas no aprobadas
    ///      también se reembolsan al cliente (regla de producto documentada).
    function cancelProject(bytes32 projectId) external nonReentrant {
        Project storage p = _activeProject(projectId);
        if (msg.sender != p.client) revert NotClient();

        Milestone[] storage ms = projectMilestones[projectId];
        if (ms[0].approvedAt == 0) revert StageZeroLocked();

        uint256 refund = 0;
        for (uint256 i; i < ms.length; i++) {
            if (ms[i].approvedAt == 0) refund += ms[i].amount;
        }

        p.status = ProjectStatus.Cancelled;

        emit ProjectCancelled(projectId, refund);

        if (refund > 0) _currencyToken(p.currency).safeTransfer(p.client, refund);
    }

    // ─── Disputas (hook del Agente Orquestador) ──────────────────

    /// @notice Cliente o contratista escala una etapa entregada a disputa.
    /// @dev Requiere `agent != address(0)`, `stageIndex > 0` (la etapa 0 es intocable),
    ///      hito entregado y no liquidado. Bloquea approve/cancel/autoRelease hasta resolver.
    function disputeStage(bytes32 projectId, uint8 stageIndex) external {
        Project storage p = _activeProject(projectId);
        if (msg.sender != p.client && msg.sender != p.contractor) revert NotParty();
        if (p.agent == address(0)) revert NoAgentSet();
        if (stageIndex == 0 || stageIndex >= p.totalStages) revert InvalidStage();

        Milestone storage m = projectMilestones[projectId][stageIndex];
        if (m.deliveredAt == 0) revert StageNotDelivered();
        if (m.approvedAt != 0) revert StageAlreadyApproved();

        p.status = ProjectStatus.Disputed;
        emit ProjectDisputed(projectId, stageIndex, msg.sender);
    }

    /// @notice El `agent` del proyecto resuelve la disputa repartiendo la fracción.
    /// @param contractorShareBps Parte del hito para el contratista en basis points (0–10000).
    /// @dev Es el punto de entrada del futuro Agente Orquestador (ver SPEC_ORQUESTADOR).
    ///      El hito queda liquidado (excluido de futuros refunds) y el proyecto vuelve a Active
    ///      — o Completed si era la última etapa.
    function resolveDispute(
        bytes32 projectId,
        uint8 stageIndex,
        uint16 contractorShareBps
    ) external nonReentrant {
        Project storage p = projects[projectId];
        if (p.client == address(0)) revert ProjectNotFound();
        if (p.status != ProjectStatus.Disputed) revert ProjectNotDisputed();
        if (msg.sender != p.agent) revert NotAgent();
        if (contractorShareBps > 10_000) revert InvalidShareBps();
        // Con entrega secuencial, la única etapa disputable es la actual (entregada y no liquidada)
        if (stageIndex != p.currentStage) revert InvalidStage();

        Milestone storage m = projectMilestones[projectId][stageIndex];
        if (m.deliveredAt == 0 || m.approvedAt != 0) revert InvalidStage();

        uint256 contractorPaid = (m.amount * contractorShareBps) / 10_000;
        uint256 clientRefunded = m.amount - contractorPaid;

        m.approvedAt = block.timestamp; // hito resuelto: excluido de refunds futuros
        p.currentStage++;
        p.status = p.currentStage == p.totalStages ? ProjectStatus.Completed : ProjectStatus.Active;

        emit DisputeResolved(projectId, stageIndex, contractorPaid, clientRefunded);
        if (p.status == ProjectStatus.Completed) emit ProjectCompleted(projectId);

        IERC20 token = _currencyToken(p.currency);
        if (contractorPaid > 0) token.safeTransfer(p.contractor, contractorPaid);
        if (clientRefunded > 0) token.safeTransfer(p.client, clientRefunded);
    }

    // ─── Views ───────────────────────────────────────────────────

    function getProject(bytes32 projectId) external view returns (Project memory) {
        return projects[projectId];
    }

    function getMilestones(bytes32 projectId) external view returns (Milestone[] memory) {
        return projectMilestones[projectId];
    }

    function getClientProjects(address client) external view returns (bytes32[] memory) {
        return clientProjects[client];
    }

    function getContractorProjects(address contractor) external view returns (bytes32[] memory) {
        return contractorProjects[contractor];
    }

    // ─── Internals ───────────────────────────────────────────────

    function _activeProject(bytes32 projectId) internal view returns (Project storage p) {
        p = projects[projectId];
        if (p.client == address(0)) revert ProjectNotFound();
        if (p.status != ProjectStatus.Active) revert ProjectNotActive();
    }

    function _currencyToken(CurrencyType currency) internal view returns (IERC20) {
        return currency == CurrencyType.USD ? usdcToken : arsToken;
    }
}
