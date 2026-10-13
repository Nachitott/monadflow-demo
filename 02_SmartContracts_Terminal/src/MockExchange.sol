// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CurrencyType} from "./types/CurrencyType.sol";

/// @dev Interfaz mínima del faucet demo de los tokens mock.
interface IMintable {
    function mint(address to, uint256 amount) external;
}

/// @notice Conversión entre las carteras duales del usuario (ARS ↔ USD) con tipo de cambio administrado.
/// @dev LIMITACIÓN DEMO: `arsPerUsd` es fijo/admin-settable y la liquidez es simulada (pool infinito
///      vía `mint` del token destino). No refleja mercado real. Reemplazable por oráculo/ramp sin
///      tocar TimeStream ni MilestoneEscrow. Los tokens de origen quedan acumulados en este contrato.
contract MockExchange is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Cuántos mARS (18 dec) vale 1 mUSDC entero. Escala fija 1e18.
    ///         Ej: 1 USD = 1200 ARS → arsPerUsd = 1200e18.
    uint256 public arsPerUsd;

    IERC20 public immutable usdcToken; // 6 decimales
    IERC20 public immutable arsToken;  // 18 decimales

    event Converted(
        address indexed user,
        CurrencyType indexed fromCurrency,
        CurrencyType indexed toCurrency,
        uint256 amountIn,
        uint256 amountOut,
        uint256 rateApplied
    );
    event RateUpdated(uint256 previousRate, uint256 newRate);

    error InvalidRate();
    error InvalidAmount();
    error ZeroAddress();

    constructor(address _usdcToken, address _arsToken, uint256 _arsPerUsd) Ownable(msg.sender) {
        if (_usdcToken == address(0) || _arsToken == address(0)) revert ZeroAddress();
        if (_arsPerUsd == 0) revert InvalidRate();
        usdcToken = IERC20(_usdcToken);
        arsToken = IERC20(_arsToken);
        arsPerUsd = _arsPerUsd;
    }

    /// @notice Ajusta el tipo de cambio administrado. Solo el owner (admin demo).
    function setRate(uint256 newArsPerUsd) external onlyOwner {
        if (newArsPerUsd == 0) revert InvalidRate();
        uint256 previousRate = arsPerUsd;
        arsPerUsd = newArsPerUsd;
        emit RateUpdated(previousRate, newArsPerUsd);
    }

    /// @notice Convierte mUSDC → mARS: `amountArs = amountUsdc * arsPerUsd / 1e6`.
    ///         Requiere `approve` previo del usuario sobre `amountUsdc`.
    function swapUSDCforARS(uint256 amountUsdc) external nonReentrant returns (uint256 amountArs) {
        amountArs = (amountUsdc * arsPerUsd) / 1e6;
        if (amountUsdc == 0 || amountArs == 0) revert InvalidAmount();

        emit Converted(msg.sender, CurrencyType.USD, CurrencyType.ARS, amountUsdc, amountArs, arsPerUsd);

        usdcToken.safeTransferFrom(msg.sender, address(this), amountUsdc);
        IMintable(address(arsToken)).mint(msg.sender, amountArs);
    }

    /// @notice Convierte mARS → mUSDC: `amountUsdc = amountArs * 1e6 / arsPerUsd`.
    ///         Requiere `approve` previo del usuario sobre `amountArs`.
    function swapARSforUSDC(uint256 amountArs) external nonReentrant returns (uint256 amountUsdc) {
        amountUsdc = (amountArs * 1e6) / arsPerUsd;
        if (amountArs == 0 || amountUsdc == 0) revert InvalidAmount();

        emit Converted(msg.sender, CurrencyType.ARS, CurrencyType.USD, amountArs, amountUsdc, arsPerUsd);

        arsToken.safeTransferFrom(msg.sender, address(this), amountArs);
        IMintable(address(usdcToken)).mint(msg.sender, amountUsdc);
    }
}
