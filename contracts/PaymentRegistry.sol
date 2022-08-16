//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./boringcrypto/BoringBatchable.sol";

contract PaymentRegistry is AccessControlEnumerable, BoringBatchable {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public constant PAYMENT_TOKEN_NATIVE = address(1);

    mapping(bytes32 => address) public paymentAssets;

    event PaymentAssetSet(bytes32 paymentTag, address newPaymentAssetAddress);

    constructor(address _governance, address _operator) {
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, _governance);
        _setupRole(OPERATOR_ROLE, _operator);
    }

    function getPaymentToken(bytes32 _paymentTag)
        external
        view
        returns (address)
    {
        return paymentAssets[_paymentTag];
    }

    function setPaymentToken(bytes32 _paymentTag, address _paymentAsset)
        external
        onlyRole(OPERATOR_ROLE)
    {
        paymentAssets[_paymentTag] = _paymentAsset;

        emit PaymentAssetSet(_paymentTag, _paymentAsset);
    }
}
