// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Token ERC-20 de prueba que representa la cartera en Pesos Argentinos del usuario.
/// @dev `mint` público SOLO para demo/hackathon (faucet). Nunca desplegar así en producción.
contract MockARS is ERC20 {
    constructor() ERC20("Mock ARS", "mARS") {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Faucet demo: acredita `amount` a `to` sin restricciones.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
