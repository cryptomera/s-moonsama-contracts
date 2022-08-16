//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IFeeManager {
    function getFee(
        bytes32 _paymentTag,
        address _assetAddress,
        uint256 _assetId,
        uint256 totalAmount
    ) external returns (address, uint256);
}
