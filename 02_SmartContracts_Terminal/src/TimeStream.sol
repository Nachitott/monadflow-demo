// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {CurrencyType} from "./types/CurrencyType.sol";

/// @notice Modo 1 — Cobro por uso/tiempo (Pay-per-use Stream).
/// @dev Solvencia garantizada por escrow por sesión: al iniciar se retiene el `maxCap` completo
///      del usuario; al cerrar se liquida lo consumido y se devuelve el sobrante.
///      La tarifa la fija el comercio (registry on-chain) o un voucher EIP-712 firmado por el
///      comercio (tarifas promo/dinámicas sin tx extra). El cliente NUNCA elige el precio.
///      Optimización Monad Parallel EVM: mappings aislados por bytes32/address, sin acumuladores
///      globales — dos sesiones o comercios distintos nunca compiten por el mismo slot.
///      Account-agnostic: opera sobre `msg.sender` (Smart Account ERC-4337); no valida firmas
///      de usuario — el único chequeo criptográfico es el voucher del COMERCIO.
contract TimeStream is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Tipos ───────────────────────────────────────────────────

    struct MerchantProfile {
        uint256 ratePerSecond;   // tarifa en unidades base del token por segundo
        CurrencyType rateCurrency; // moneda en que está denominada la tarifa
        bool disabled;           // killswitch
    }

    struct StreamSession {
        bytes32 id;
        address user;
        address merchant;
        uint256 ratePerSecond;    // rate resuelto al iniciar — congelado en la sesión
        uint256 maxCap;
        uint256 balanceDeposited; // == maxCap (escrow por sesión)
        uint256 startTime;
        uint256 stopTime;
        uint256 totalPaid;
        CurrencyType currency;
        bool active;
    }

    // ─── Estado ──────────────────────────────────────────────────

    IERC20 public immutable usdcToken;
    IERC20 public immutable arsToken;

    mapping(bytes32 => StreamSession) public sessions;
    mapping(address => MerchantProfile) public merchants;
    mapping(address => bytes32[]) public merchantSessions;
    mapping(address => bytes32[]) public userSessions;

    uint256 private nonce; // derivación de sessionId único

    /// @dev Typehash EIP-712 del voucher de tarifa firmado por el comercio.
    bytes32 public constant RATE_VOUCHER_TYPEHASH = keccak256(
        "RateVoucher(address merchant,uint256 ratePerSecond,uint8 currency,uint256 expiresAt,bytes32 qrNonce)"
    );

    // ─── Eventos (indexed en actor + id — listener-friendly) ─────

    event RateSet(address indexed merchant, uint256 ratePerSecond, CurrencyType currency);
    event MerchantDeactivated(address indexed merchant, uint256 timestamp);
    event MerchantReactivated(address indexed merchant, uint256 timestamp);
    event StreamStarted(
        bytes32 indexed sessionId,
        address indexed user,
        address indexed merchant,
        uint256 ratePerSecond,
        uint256 maxCap,
        CurrencyType currency
    );
    event StreamSettled(
        bytes32 indexed sessionId,
        address indexed user,
        address indexed merchant,
        uint256 durationSeconds,
        uint256 totalPaid,
        uint256 refunded
    );

    // ─── Errores ─────────────────────────────────────────────────

    error ZeroAddress();
    error InvalidRate();
    error InvalidCap();
    error MerchantDisabled();
    error RateNotSet();
    error CurrencyMismatch();
    error VoucherExpired();
    error InvalidVoucherSignature();
    error SessionNotActive();
    error NotAuthorized();
    error NoMerchantProfile();

    // ─── Constructor ─────────────────────────────────────────────

    constructor(address _usdcToken, address _arsToken) EIP712("MonadFlow TimeStream", "1") {
        if (_usdcToken == address(0) || _arsToken == address(0)) revert ZeroAddress();
        usdcToken = IERC20(_usdcToken);
        arsToken = IERC20(_arsToken);
    }

    // ─── Registry de tarifas (vista comercio) ────────────────────

    /// @notice Publica/actualiza la tarifa oficial del comercio. Self-registration:
    ///         cualquier address se registra como comercio siendo `msg.sender`.
    function setRate(uint256 ratePerSecond, CurrencyType currency) external {
        if (ratePerSecond == 0) revert InvalidRate();
        MerchantProfile storage profile = merchants[msg.sender];
        profile.ratePerSecond = ratePerSecond;
        profile.rateCurrency = currency;
        emit RateSet(msg.sender, ratePerSecond, currency);
    }

    // ─── Killswitch (por address de comercio, unificado) ─────────

    /// @notice Desactiva el QR del comercio: bloquea nuevos `startStream`.
    ///         Las sesiones activas siguen hasta su cierre natural.
    function deactivateQR() external {
        MerchantProfile storage profile = merchants[msg.sender];
        if (profile.ratePerSecond == 0) revert NoMerchantProfile();
        profile.disabled = true;
        emit MerchantDeactivated(msg.sender, block.timestamp);
    }

    /// @notice Reactiva el QR del comercio.
    function reactivateQR() external {
        MerchantProfile storage profile = merchants[msg.sender];
        if (profile.ratePerSecond == 0) revert NoMerchantProfile();
        profile.disabled = false;
        emit MerchantReactivated(msg.sender, block.timestamp);
    }

    // ─── Sesiones de cobro ───────────────────────────────────────

    /// @notice Inicia una sesión de cobro por tiempo con escrow de `maxCap`.
    /// @param merchant Address del comercio (del QR escaneado).
    /// @param maxCap   Tope máximo de gasto elegido por el usuario (Auto-Cap).
    /// @param currency Moneda del depósito — debe coincidir con la del rate.
    /// @param voucher  Vacío → tarifa del registry; no vacío → `abi.encode(
    ///                 ratePerSecond, currency(uint8), expiresAt, qrNonce, signature)`
    ///                 con firma EIP-712 `RateVoucher` del comercio.
    function startStream(
        address merchant,
        uint256 maxCap,
        CurrencyType currency,
        bytes calldata voucher
    ) external returns (bytes32 sessionId) {
        if (maxCap == 0) revert InvalidCap();

        MerchantProfile storage profile = merchants[merchant];
        if (profile.disabled) revert MerchantDisabled();

        uint256 ratePerSecond;
        if (voucher.length == 0) {
            if (profile.ratePerSecond == 0) revert RateNotSet();
            if (profile.rateCurrency != currency) revert CurrencyMismatch();
            ratePerSecond = profile.ratePerSecond;
        } else {
            ratePerSecond = _resolveVoucher(merchant, currency, voucher);
        }

        // forge-lint: disable-next-line(weak-prng) — ID único por nonce+timestamp, no es RNG de seguridad
        sessionId = keccak256(abi.encode(msg.sender, merchant, nonce++, block.timestamp));
        sessions[sessionId] = StreamSession({
            id: sessionId,
            user: msg.sender,
            merchant: merchant,
            ratePerSecond: ratePerSecond,
            maxCap: maxCap,
            balanceDeposited: maxCap,
            startTime: block.timestamp,
            stopTime: 0,
            totalPaid: 0,
            currency: currency,
            active: true
        });
        userSessions[msg.sender].push(sessionId);
        merchantSessions[merchant].push(sessionId);

        // forge-lint: disable-next-line(reentrancy-events) — el "external call" previo es ecrecover (precompile, no reentra)
        emit StreamStarted(sessionId, msg.sender, merchant, ratePerSecond, maxCap, currency);

        _currencyToken(currency).safeTransferFrom(msg.sender, address(this), maxCap);
    }

    /// @notice Cierra la sesión y liquida: paga lo consumido al comercio y devuelve el resto.
    /// @dev Callable por `session.user`, `session.merchant`, o CUALQUIERA si el cap ya se
    ///      agotó (`elapsed * rate >= maxCap`) — evita fondos atrapados si el cliente abandona.
    function stopStream(bytes32 sessionId) external nonReentrant returns (uint256 totalPaid) {
        StreamSession storage s = sessions[sessionId];
        if (!s.active) revert SessionNotActive();

        uint256 duration = block.timestamp - s.startTime;
        uint256 owed = duration * s.ratePerSecond;
        totalPaid = owed > s.maxCap ? s.maxCap : owed;

        if (msg.sender != s.user && msg.sender != s.merchant && owed < s.maxCap) {
            revert NotAuthorized();
        }

        uint256 refunded = s.balanceDeposited - totalPaid;
        s.active = false;
        s.stopTime = block.timestamp;
        s.totalPaid = totalPaid;

        emit StreamSettled(sessionId, s.user, s.merchant, duration, totalPaid, refunded);

        IERC20 token = _currencyToken(s.currency);
        if (totalPaid > 0) token.safeTransfer(s.merchant, totalPaid);
        if (refunded > 0) token.safeTransfer(s.user, refunded);
    }

    // ─── Views ───────────────────────────────────────────────────

    /// @notice Devuelve la sesión completa (struct) — el getter público devuelve tuple.
    function getSession(bytes32 sessionId) external view returns (StreamSession memory) {
        return sessions[sessionId];
    }

    /// @notice Monto acumulado a cobrar si la sesión cerrara ahora: min(elapsed*rate, cap).
    function accruedAmount(bytes32 sessionId) external view returns (uint256) {
        StreamSession storage s = sessions[sessionId];
        if (!s.active) return s.totalPaid;
        uint256 owed = (block.timestamp - s.startTime) * s.ratePerSecond;
        return owed > s.maxCap ? s.maxCap : owed;
    }

    function getUserSessions(address user) external view returns (bytes32[] memory) {
        return userSessions[user];
    }

    function getMerchantSessions(address merchant) external view returns (bytes32[] memory) {
        return merchantSessions[merchant];
    }

    // ─── Internals ───────────────────────────────────────────────

    /// @dev Verifica el voucher EIP-712 `RateVoucher` firmado por `merchant` y devuelve el rate.
    ///      Stateless por diseño (MVP): el voucher habilita la tarifa promo hasta `expiresAt`;
    ///      `qrNonce` queda ligado al QR emitido sin tracking on-chain.
    function _resolveVoucher(
        address merchant,
        CurrencyType currency,
        bytes calldata voucher
    ) internal view returns (uint256 ratePerSecond) {
        (uint256 vRate, uint8 vCurrency, uint256 expiresAt, bytes32 qrNonce, bytes memory sig) =
            abi.decode(voucher, (uint256, uint8, uint256, bytes32, bytes));

        if (block.timestamp > expiresAt) revert VoucherExpired();
        if (vRate == 0) revert InvalidRate();
        if (CurrencyType(vCurrency) != currency) revert CurrencyMismatch();

        bytes32 structHash = keccak256(
            abi.encode(RATE_VOUCHER_TYPEHASH, merchant, vRate, vCurrency, expiresAt, qrNonce)
        );
        if (ECDSA.recover(_hashTypedDataV4(structHash), sig) != merchant) {
            revert InvalidVoucherSignature();
        }
        return vRate;
    }

    function _currencyToken(CurrencyType currency) internal view returns (IERC20) {
        return currency == CurrencyType.USD ? usdcToken : arsToken;
    }
}
