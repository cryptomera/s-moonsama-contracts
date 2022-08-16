//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IPermissionRegistry {
    function checkAuctionAllowed(
        address _assetAddress,
        uint256 _tokenId,
        address _maker,
        bytes32 _paymentTag
    ) external view returns (bool);

    function checkBidAllowed(
        address _assetAddress,
        uint256 _tokenId,
        address _bider
    ) external view returns (bool);

    function setBlacklistedBider(address _biderAddress, bool _isBlacklistUser)
        external;

    function setBlacklistedMakerByCollection(
        address _makerAddress,
        address _assetId,
        bool _isBlacklistUser
    ) external;

    function setBlacklistedMaker(address _makerAddress, bool _isBlacklistUser)
        external;

    function setBlacklistedBiderByCollection(
        address _biderAddress,
        address _assetId,
        bool _isBlacklistUser
    ) external;
}
