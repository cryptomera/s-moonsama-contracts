//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./boringcrypto/BoringBatchable.sol";

import "./interfaces/IPermissionRegistry.sol";

contract PermissionRegistry is
    AccessControlEnumerable,
    BoringBatchable,
    IPermissionRegistry
{
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    event EventBlacklistedCollection(address nftAddress, bool isBlackListed);
    event EventBlacklistedMaker(address makerAddress, bool isBlackListed);
    event EventBlacklistedMakerByCollection(
        address biderAddress,
        address _assetAddress,
        bool isBlackListed
    );
    event EventBlacklistedBider(address biderAddress, bool isBlackListed);
    event EventBlacklistedBiderByCollection(
        address biderAddress,
        address _assetAddress,
        bool isBlackListed
    );

    event EventBlacklistedCollectionNft(
        address nftAddress,
        uint256 _assetId,
        bool isBlackListed
    );

    // Collections
    mapping(address => bool) public isBlacklistedCollection;
    mapping(address => mapping(uint256 => bool))
        public isBlacklistedNftByCollection;
    // Makers permissions
    mapping(address => bool) public isBlacklistedMakers;
    mapping(address => mapping(address => bool))
        public isBlacklistedMakersByCollection;
    // Biders permissions
    mapping(address => bool) public isBlacklistedBiders;
    mapping(address => mapping(address => bool))
        public isBlacklistedBidersByCollection;

    constructor(address _governance, address _operator) {
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, _governance);
        _setupRole(OPERATOR_ROLE, _operator);
    }

    function checkAuctionAllowed(
        address _assetAddress,
        uint256 _assetId,
        address _makerAddress,
        bytes32 /*_paymentTag*/
    ) external view returns (bool) {
        if (
            isBlacklistedCollection[_assetAddress] ||
            isBlacklistedNftByCollection[_assetAddress][_assetId] ||
            isBlacklistedMakers[_makerAddress] ||
            isBlacklistedMakersByCollection[_makerAddress][_assetAddress]
        ) {
            return false;
        }

        return true;
    }

    function checkBidAllowed(
        address _assetAddress,
        uint256 _assetId,
        address _biderAddress
    ) external view returns (bool) {
        if (
            isBlacklistedBiders[_biderAddress] ||
            isBlacklistedBidersByCollection[_biderAddress][_assetAddress]
        ) {
            return false;
        }
        return true;
    }

    function setBlacklistedCollection(
        address _assetAddress,
        bool _isBlackListed
    ) external onlyRole(OPERATOR_ROLE) {
        isBlacklistedCollection[_assetAddress] = _isBlackListed;
        emit EventBlacklistedCollection(_assetAddress, _isBlackListed);
    }

    function setBlacklistedNftByCollection(
        address _assetAddress,
        uint256 _assetId,
        bool _isBlackList
    ) external onlyRole(OPERATOR_ROLE) {
        isBlacklistedNftByCollection[_assetAddress][_assetId] = _isBlackList;
        emit EventBlacklistedCollectionNft(
            _assetAddress,
            _assetId,
            _isBlackList
        );
    }

    function setBlacklistedMaker(address _makerAddress, bool _isBlacklistedUser)
        external
        onlyRole(OPERATOR_ROLE)
    {
        isBlacklistedMakers[_makerAddress] = _isBlacklistedUser;
        emit EventBlacklistedMaker(_makerAddress, _isBlacklistedUser);
    }

    function setBlacklistedMakerByCollection(
        address _makerAddress,
        address _assetAddress,
        bool _isBlacklistedUser
    ) external onlyRole(OPERATOR_ROLE) {
        isBlacklistedMakersByCollection[_makerAddress][
            _assetAddress
        ] = _isBlacklistedUser;
        emit EventBlacklistedMaker(_makerAddress, _isBlacklistedUser);
    }

    function setBlacklistedBider(address _biderAddress, bool _isBlacklistedUser)
        external
        onlyRole(OPERATOR_ROLE)
    {
        isBlacklistedBiders[_biderAddress] = _isBlacklistedUser;
        emit EventBlacklistedBider(_biderAddress, _isBlacklistedUser);
    }

    function setBlacklistedBiderByCollection(
        address _biderAddress,
        address _assetAddress,
        bool _isBlacklistedUser
    ) external onlyRole(OPERATOR_ROLE) {
        isBlacklistedBidersByCollection[_biderAddress][
            _assetAddress
        ] = _isBlacklistedUser;
        emit EventBlacklistedBiderByCollection(
            _biderAddress,
            _assetAddress,
            _isBlacklistedUser
        );
    }
}
