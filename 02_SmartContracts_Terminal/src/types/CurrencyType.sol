// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Moneda en la que se denomina un acuerdo, tarifa o sesión de MonadFlow.
/// @dev Resuelta por dirección de token en los constructores de los contratos de negocio
///      (usdcToken / arsToken). Los contratos nunca exponen este enum al usuario final.
enum CurrencyType {
    ARS,
    USD
}
