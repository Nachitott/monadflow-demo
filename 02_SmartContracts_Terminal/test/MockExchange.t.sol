// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MockUSDC} from "../src/tokens/MockUSDC.sol";
import {MockARS} from "../src/tokens/MockARS.sol";
import {MockExchange} from "../src/MockExchange.sol";
import {CurrencyType} from "../src/types/CurrencyType.sol";

contract MockExchangeTest is Test {
    MockUSDC usdc;
    MockARS ars;
    MockExchange exchange;

    address owner = makeAddr("owner");
    address user = makeAddr("user");
    address stranger = makeAddr("stranger");

    // 1 USD = 1200 ARS (escala 1e18)
    uint256 constant RATE = 1200e18;

    function setUp() public {
        usdc = new MockUSDC();
        ars = new MockARS();
        vm.prank(owner);
        exchange = new MockExchange(address(usdc), address(ars), RATE);

        usdc.mint(user, 10_000e6);           // 10.000 USD
        ars.mint(user, 12_000_000e18);       // 12.000.000 ARS

        vm.startPrank(user);
        usdc.approve(address(exchange), type(uint256).max);
        ars.approve(address(exchange), type(uint256).max);
        vm.stopPrank();
    }

    // ─── Tokens base ───────────────────────────────────────────────

    function test_TokenDecimals() public view {
        assertEq(usdc.decimals(), 6);
        assertEq(ars.decimals(), 18);
    }

    function test_MintIsPublicFaucet() public {
        usdc.mint(stranger, 5e6);
        ars.mint(stranger, 5e18);
        assertEq(usdc.balanceOf(stranger), 5e6);
        assertEq(ars.balanceOf(stranger), 5e18);
    }

    // ─── Swaps ─────────────────────────────────────────────────────

    function test_SwapUSDCforARS() public {
        uint256 usdcIn = 100e6; // 100 USD
        uint256 expectedArs = (usdcIn * RATE) / 1e6; // 120.000 ARS

        vm.expectEmit(true, true, true, true);
        emit MockExchange.Converted(user, CurrencyType.USD, CurrencyType.ARS, usdcIn, expectedArs, RATE);

        vm.prank(user);
        uint256 out = exchange.swapUSDCforARS(usdcIn);

        assertEq(out, expectedArs);
        assertEq(usdc.balanceOf(user), 10_000e6 - usdcIn);
        assertEq(ars.balanceOf(user), 12_000_000e18 + expectedArs);
        // El token de origen queda acumulado en el exchange (liquidez simulada)
        assertEq(usdc.balanceOf(address(exchange)), usdcIn);
    }

    function test_SwapARSforUSDC() public {
        uint256 arsIn = 240_000e18; // 240.000 ARS
        uint256 expectedUsdc = (arsIn * 1e6) / RATE; // 200 USD

        vm.expectEmit(true, true, true, true);
        emit MockExchange.Converted(user, CurrencyType.ARS, CurrencyType.USD, arsIn, expectedUsdc, RATE);

        vm.prank(user);
        uint256 out = exchange.swapARSforUSDC(arsIn);

        assertEq(out, expectedUsdc);
        assertEq(ars.balanceOf(user), 12_000_000e18 - arsIn);
        assertEq(usdc.balanceOf(user), 10_000e6 + expectedUsdc);
        assertEq(ars.balanceOf(address(exchange)), arsIn);
    }

    function test_SwapUsesUpdatedRate() public {
        uint256 newRate = 1500e18;
        vm.prank(owner);
        exchange.setRate(newRate);

        vm.prank(user);
        uint256 out = exchange.swapUSDCforARS(100e6);
        assertEq(out, (100e6 * newRate) / 1e6); // 150.000 ARS
    }

    // ─── Access control ────────────────────────────────────────────

    function test_SetRateOnlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vm.prank(stranger);
        exchange.setRate(2000e18);
    }

    function test_SetRateEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit MockExchange.RateUpdated(RATE, 1300e18);
        vm.prank(owner);
        exchange.setRate(1300e18);
        assertEq(exchange.arsPerUsd(), 1300e18);
    }

    // ─── Reverts ───────────────────────────────────────────────────

    function test_RevertSetRateZero() public {
        vm.expectRevert(MockExchange.InvalidRate.selector);
        vm.prank(owner);
        exchange.setRate(0);
    }

    function test_RevertConstructorZeroRate() public {
        vm.expectRevert(MockExchange.InvalidRate.selector);
        new MockExchange(address(usdc), address(ars), 0);
    }

    function test_RevertConstructorZeroAddress() public {
        vm.expectRevert(MockExchange.ZeroAddress.selector);
        new MockExchange(address(0), address(ars), RATE);
        vm.expectRevert(MockExchange.ZeroAddress.selector);
        new MockExchange(address(usdc), address(0), RATE);
    }

    function test_RevertSwapZeroAmount() public {
        vm.expectRevert(MockExchange.InvalidAmount.selector);
        vm.prank(user);
        exchange.swapUSDCforARS(0);

        vm.expectRevert(MockExchange.InvalidAmount.selector);
        vm.prank(user);
        exchange.swapARSforUSDC(0);
    }

    function test_RevertSwapDustOutput() public {
        // 1 unidad mínima de mARS → amountUsdc = 1e6 / 1200e18 = 0 → revert
        vm.expectRevert(MockExchange.InvalidAmount.selector);
        vm.prank(user);
        exchange.swapARSforUSDC(1);
    }

    function test_RevertSwapWithoutApproval() public {
        usdc.mint(stranger, 100e6);
        vm.expectRevert();
        vm.prank(stranger);
        exchange.swapUSDCforARS(100e6);
    }
}
