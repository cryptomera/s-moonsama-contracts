//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "./interfaces/IPaymentRegistry.sol";
import "./interfaces/IPaymentListener.sol";

import "./DomainV1.sol";

abstract contract PaymentProcessorBase is DomainV1 {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant CASHIER_ROLE = keccak256("CASHIER_ROLE");

    uint256 internal msgValueCounter;

    IPaymentRegistry public paymentRegistry;
    IPaymentListener public paymentListener;

    event Charged(
        uint256 amountTransferred,
        uint256 amountBurned,
        bytes32 paymentTag,
        address transferRecipient,
        address chargeOperator,
        address invoicedAddress
    );

    event ChargedBatch(
        uint256[] amountsTransferred,
        uint256[] amountsBurned,
        bytes32[] paymentTags,
        address[] transferRecipients,
        address chargeOperator,
        address invoicedAddress
    );

    event TagSet(bytes32 tag, address assetAddress);

    event PaymentRegistrySet(address newPaymentRegistry);
    event PaymentListenerSet(address newPaymentListener);
}
