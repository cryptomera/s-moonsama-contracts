//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "../PaymentProcessorV1.sol";

contract PaymentProcessorV2 is PaymentProcessorV1 {
    function initialize2() external reinitializer(2) {}

    function yolococo() public pure returns (string memory) {
        return "yolococo";
    }
}

contract BadPaymentProcessorV2 is PaymentProcessorV1 {
    function initialize2() external reinitializer(1) {}

    function yolococo() public pure returns (string memory) {
        return "yolococo";
    }
}
