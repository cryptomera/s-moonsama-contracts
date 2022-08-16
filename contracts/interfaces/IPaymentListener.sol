//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IPaymentListener {
    function onPayment(
        address _chargedAddress,
        uint256 _amountTransferred,
        uint256 _amountBurned,
        address _transferRecipient,
        bytes32 _paymentTag,
        address _operator
    ) external view;
}
