//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IPaymentProcessorV1 {
    function charge(
        address _chargedAddress,
        address _invoicedAddress,
        uint256 _amountTransferred,
        uint256 _amountBurned,
        address _transferRecipient,
        bytes32 _paymentTag,
        bool fireEvent
    ) external payable;

    function chargeBatch(
        address _chargedAddress,
        address _invoicedAddress,
        uint256[] memory _amountTransferred,
        uint256[] memory _amountBurned,
        address[] memory _transferRecipient,
        bytes32[] memory _paymentTags,
        bool fireEvent
    ) external payable;

    function transferNonFungibleAsset(
        address _assetAddress,
        address _from,
        address _to,
        uint256 _assetId
    ) external;

    function getPaymentToken(bytes32 _paymentTag)
        external
        view
        returns (address);
}
