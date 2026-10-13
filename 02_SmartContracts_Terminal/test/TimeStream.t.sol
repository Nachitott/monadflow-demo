// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/tokens/MockUSDC.sol";
import {MockARS} from "../src/tokens/MockARS.sol";
import {TimeStream} from "../src/TimeStream.sol";
import {CurrencyType} from "../src/types/CurrencyType.sol";

contract TimeStreamTest is Test {
    MockUSDC usdc;
    MockARS ars;
    TimeStream timeStream;

    uint256 merchantPk = 0xB0B;
    address merchant;
    uint256 otherPk = 0xCAFE;
    address otherMerchant;

    address user = makeAddr("user");
    address stranger = makeAddr("stranger");

    // 0.01 USD/seg (USDC 6 dec) → 60s = 0.6 USD
    uint256 constant RATE_USD = 1e4;
    // 0.5 ARS/seg (ARS 18 dec) → 60s = 30 ARS
    uint256 constant RATE_ARS = 5e17;
    uint256 constant MAX_CAP = 10e6; // 10 USD

    bytes32 constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    function setUp() public {
        usdc = new MockUSDC();
        ars = new MockARS();
        timeStream = new TimeStream(address(usdc), address(ars));

        merchant = vm.addr(merchantPk);
        otherMerchant = vm.addr(otherPk);

        usdc.mint(user, 1_000e6);
        ars.mint(user, 1_000_000e18);
        vm.startPrank(user);
        usdc.approve(address(timeStream), type(uint256).max);
        ars.approve(address(timeStream), type(uint256).max);
        vm.stopPrank();

        vm.prank(merchant);
        timeStream.setRate(RATE_USD, CurrencyType.USD);
    }

    // ─── Helpers voucher EIP-712 ─────────────────────────────────

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256("MonadFlow TimeStream"),
            keccak256("1"),
            block.chainid,
            address(timeStream)
        ));
    }

    function _signVoucher(
        uint256 pk,
        address merchant_,
        uint256 rate,
        uint8 currency,
        uint256 expiresAt,
        bytes32 qrNonce
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            timeStream.RATE_VOUCHER_TYPEHASH(), merchant_, rate, currency, expiresAt, qrNonce
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encode(rate, currency, expiresAt, qrNonce, abi.encodePacked(r, s, v));
    }

    function _startDefault() internal returns (bytes32 sessionId) {
        vm.prank(user);
        sessionId = timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, "");
    }

    // ─── Registry de tarifas ─────────────────────────────────────

    function test_SetRate() public {
        vm.expectEmit(true, false, false, true);
        emit TimeStream.RateSet(stranger, RATE_ARS, CurrencyType.ARS);
        vm.prank(stranger);
        timeStream.setRate(RATE_ARS, CurrencyType.ARS);

        (uint256 rate, CurrencyType cur, bool disabled) = timeStream.merchants(stranger);
        assertEq(rate, RATE_ARS);
        assertEq(uint8(cur), uint8(CurrencyType.ARS));
        assertFalse(disabled);
    }

    function test_RevertSetRateZero() public {
        vm.expectRevert(TimeStream.InvalidRate.selector);
        vm.prank(merchant);
        timeStream.setRate(0, CurrencyType.USD);
    }

    // ─── startStream (registry) ──────────────────────────────────

    function test_StartStreamRegistry() public {
        uint256 userBefore = usdc.balanceOf(user);

        // topic1 (sessionId) no se puede conocer antes de la llamada → no se chequea
        vm.expectEmit(false, true, true, true);
        emit TimeStream.StreamStarted(bytes32(0), user, merchant, RATE_USD, MAX_CAP, CurrencyType.USD);

        vm.prank(user);
        bytes32 sessionId = timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, "");

        // Escrow completo retenido
        assertEq(usdc.balanceOf(user), userBefore - MAX_CAP);
        assertEq(usdc.balanceOf(address(timeStream)), MAX_CAP);

        TimeStream.StreamSession memory s = _session(sessionId);
        assertEq(s.user, user);
        assertEq(s.merchant, merchant);
        assertEq(s.ratePerSecond, RATE_USD);
        assertEq(s.maxCap, MAX_CAP);
        assertEq(s.balanceDeposited, MAX_CAP);
        assertEq(s.startTime, block.timestamp);
        assertTrue(s.active);

        assertEq(timeStream.getUserSessions(user).length, 1);
        assertEq(timeStream.getMerchantSessions(merchant).length, 1);
    }

    function test_RevertStartRateNotSet() public {
        vm.expectRevert(TimeStream.RateNotSet.selector);
        vm.prank(user);
        timeStream.startStream(otherMerchant, MAX_CAP, CurrencyType.USD, "");
    }

    function test_RevertStartCurrencyMismatch() public {
        // Tarifa del comercio en USD, el cliente pide depositar ARS
        vm.expectRevert(TimeStream.CurrencyMismatch.selector);
        vm.prank(user);
        timeStream.startStream(merchant, 1_000e18, CurrencyType.ARS, "");
    }

    function test_RevertStartZeroCap() public {
        vm.expectRevert(TimeStream.InvalidCap.selector);
        vm.prank(user);
        timeStream.startStream(merchant, 0, CurrencyType.USD, "");
    }

    // ─── stopStream ──────────────────────────────────────────────

    function test_StopStreamByUser() public {
        bytes32 sessionId = _startDefault();
        vm.warp(block.timestamp + 60); // 60s * 1e4 = 6e5 (0.6 USD)

        uint256 expectedPaid = 60 * RATE_USD;
        uint256 expectedRefund = MAX_CAP - expectedPaid;

        vm.expectEmit(true, true, true, true);
        emit TimeStream.StreamSettled(sessionId, user, merchant, 60, expectedPaid, expectedRefund);

        vm.prank(user);
        uint256 totalPaid = timeStream.stopStream(sessionId);

        assertEq(totalPaid, expectedPaid);
        assertEq(usdc.balanceOf(merchant), expectedPaid);
        assertEq(usdc.balanceOf(user), 1_000e6 - expectedPaid);
        assertEq(usdc.balanceOf(address(timeStream)), 0);

        TimeStream.StreamSession memory s = _session(sessionId);
        assertFalse(s.active);
        assertEq(s.totalPaid, expectedPaid);
        assertEq(s.stopTime, block.timestamp);
    }

    function test_StopStreamByMerchant() public {
        bytes32 sessionId = _startDefault();
        vm.warp(block.timestamp + 30);

        vm.prank(merchant);
        uint256 totalPaid = timeStream.stopStream(sessionId);
        assertEq(totalPaid, 30 * RATE_USD);
    }

    function test_StopStreamCapExhaustedByAnyone() public {
        bytes32 sessionId = _startDefault();
        // cap = 10e6, rate = 1e4/s → cap agotado a los 1000s
        vm.warp(block.timestamp + 1000);

        vm.prank(stranger); // cualquiera puede cerrar si el cap se agotó
        uint256 totalPaid = timeStream.stopStream(sessionId);

        assertEq(totalPaid, MAX_CAP);
        assertEq(usdc.balanceOf(merchant), MAX_CAP);
        assertEq(usdc.balanceOf(user), 1_000e6 - MAX_CAP); // refund 0
    }

    function test_RevertStopStrangerBeforeCap() public {
        bytes32 sessionId = _startDefault();
        vm.warp(block.timestamp + 10); // cap no agotado

        vm.expectRevert(TimeStream.NotAuthorized.selector);
        vm.prank(stranger);
        timeStream.stopStream(sessionId);
    }

    function test_RevertStopInactiveSession() public {
        bytes32 sessionId = _startDefault();
        vm.prank(user);
        timeStream.stopStream(sessionId);

        vm.expectRevert(TimeStream.SessionNotActive.selector);
        vm.prank(user);
        timeStream.stopStream(sessionId);
    }

    function test_RevertStopUnknownSession() public {
        vm.expectRevert(TimeStream.SessionNotActive.selector);
        timeStream.stopStream(keccak256("no-existe"));
    }

    function test_StopStreamImmediateRefundTotal() public {
        bytes32 sessionId = _startDefault();
        // Sin warp: duration 0 → paga 0, refund total
        vm.prank(user);
        uint256 totalPaid = timeStream.stopStream(sessionId);

        assertEq(totalPaid, 0);
        assertEq(usdc.balanceOf(user), 1_000e6);
        assertEq(usdc.balanceOf(merchant), 0);
    }

    // ─── Killswitch ──────────────────────────────────────────────

    function test_KillswitchBlocksNewStreams() public {
        vm.prank(merchant);
        timeStream.deactivateQR();
        assertTrue(_disabled(merchant));

        vm.expectRevert(TimeStream.MerchantDisabled.selector);
        vm.prank(user);
        timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, "");
    }

    function test_KillswitchDoesNotStopActiveSessions() public {
        bytes32 sessionId = _startDefault();

        vm.prank(merchant);
        timeStream.deactivateQR();

        vm.warp(block.timestamp + 45);
        vm.prank(user);
        uint256 totalPaid = timeStream.stopStream(sessionId);
        assertEq(totalPaid, 45 * RATE_USD); // cierra normal
    }

    function test_ReactivateQR() public {
        vm.startPrank(merchant);
        timeStream.deactivateQR();
        timeStream.reactivateQR();
        vm.stopPrank();
        assertFalse(_disabled(merchant));

        bytes32 sessionId = _startDefault();
        assertTrue(_session(sessionId).active);
    }

    function test_RevertDeactivateWithoutProfile() public {
        vm.expectRevert(TimeStream.NoMerchantProfile.selector);
        vm.prank(stranger); // nunca hizo setRate
        timeStream.deactivateQR();
    }

    // ─── Voucher EIP-712 ─────────────────────────────────────────

    function test_StartStreamVoucher() public {
        uint256 promoRate = 5e4; // promo: 0.05 USD/s (distinto al registry)
        bytes32 qrNonce = keccak256("qr-gym-001");
        bytes memory voucher = _signVoucher(
            merchantPk, merchant, promoRate, uint8(CurrencyType.USD),
            block.timestamp + 1 hours, qrNonce
        );

        vm.prank(user);
        bytes32 sessionId = timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, voucher);

        TimeStream.StreamSession memory s = _session(sessionId);
        assertEq(s.ratePerSecond, promoRate); // rate del voucher, no del registry
        assertTrue(s.active);
    }

    function test_VoucherWorksWithoutRegistryProfile() public {
        // otherMerchant nunca hizo setRate: voucher firmado alcanza
        bytes memory voucher = _signVoucher(
            otherPk, otherMerchant, RATE_USD, uint8(CurrencyType.USD),
            block.timestamp + 1 hours, bytes32(0)
        );
        vm.prank(user);
        bytes32 sessionId = timeStream.startStream(otherMerchant, MAX_CAP, CurrencyType.USD, voucher);
        assertTrue(_session(sessionId).active);
    }

    function test_RevertVoucherExpired() public {
        bytes memory voucher = _signVoucher(
            merchantPk, merchant, RATE_USD, uint8(CurrencyType.USD),
            block.timestamp - 1, // ya expiró
            bytes32(0)
        );
        vm.expectRevert(TimeStream.VoucherExpired.selector);
        vm.prank(user);
        timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, voucher);
    }

    function test_RevertVoucherWrongSigner() public {
        // Firmado por otherPk pero se reclama merchant
        bytes memory voucher = _signVoucher(
            otherPk, merchant, RATE_USD, uint8(CurrencyType.USD),
            block.timestamp + 1 hours, bytes32(0)
        );
        vm.expectRevert(TimeStream.InvalidVoucherSignature.selector);
        vm.prank(user);
        timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, voucher);
    }

    function test_RevertVoucherCurrencyMismatch() public {
        bytes memory voucher = _signVoucher(
            merchantPk, merchant, RATE_ARS, uint8(CurrencyType.ARS),
            block.timestamp + 1 hours, bytes32(0)
        );
        vm.expectRevert(TimeStream.CurrencyMismatch.selector);
        vm.prank(user);
        timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, voucher);
    }

    function test_RevertVoucherForDisabledMerchant() public {
        bytes memory voucher = _signVoucher(
            merchantPk, merchant, RATE_USD, uint8(CurrencyType.USD),
            block.timestamp + 1 hours, bytes32(0)
        );
        vm.prank(merchant);
        timeStream.deactivateQR();

        vm.expectRevert(TimeStream.MerchantDisabled.selector);
        vm.prank(user);
        timeStream.startStream(merchant, MAX_CAP, CurrencyType.USD, voucher);
    }

    // ─── ARS end-to-end ──────────────────────────────────────────

    function test_StartStopStreamInARS() public {
        vm.prank(otherMerchant);
        timeStream.setRate(RATE_ARS, CurrencyType.ARS);

        uint256 capArs = 1_000e18; // 1000 ARS
        vm.prank(user);
        bytes32 sessionId = timeStream.startStream(otherMerchant, capArs, CurrencyType.ARS, "");

        vm.warp(block.timestamp + 60); // 60s * 0.5 = 30 ARS
        vm.prank(user);
        uint256 totalPaid = timeStream.stopStream(sessionId);

        assertEq(totalPaid, 30e18);
        assertEq(ars.balanceOf(otherMerchant), 30e18);
        assertEq(ars.balanceOf(user), 1_000_000e18 - 30e18);
    }

    // ─── Views ───────────────────────────────────────────────────

    function test_AccruedAmount() public {
        bytes32 sessionId = _startDefault();
        assertEq(timeStream.accruedAmount(sessionId), 0);

        vm.warp(block.timestamp + 120);
        assertEq(timeStream.accruedAmount(sessionId), 120 * RATE_USD);

        // más allá del cap → devuelve cap
        vm.warp(block.timestamp + 2000);
        assertEq(timeStream.accruedAmount(sessionId), MAX_CAP);

        vm.prank(user);
        uint256 paid = timeStream.stopStream(sessionId);
        assertEq(paid, MAX_CAP);
        assertEq(timeStream.accruedAmount(sessionId), MAX_CAP); // devuelve totalPaid
    }

    // ─── Utils ───────────────────────────────────────────────────

    function _session(bytes32 id) internal view returns (TimeStream.StreamSession memory) {
        return timeStream.getSession(id);
    }

    function _disabled(address m) internal view returns (bool) {
        (,, bool disabled) = timeStream.merchants(m);
        return disabled;
    }
}
