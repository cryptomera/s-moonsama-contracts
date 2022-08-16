//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./interfaces/IFeeManager.sol";

contract FeeManager is AccessControlEnumerable, IFeeManager {
    struct FeeOverride {
        uint64 fee;
        bool enabled;
    }

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public feeTo;

    mapping(bytes32 => uint64) public baseFee;
    mapping(address => FeeOverride) public collectionFeeOverride;
    mapping(address => mapping(uint256 => FeeOverride)) public assetFeeOverride;

    event FeeToSet(address feeTo);
    event BaseFeeSet(bytes32 paymentTag, uint64 fee);
    event CollectionFeeOverride(address token, uint64 fee, bool enabled);
    event AssetFeeOverride(address token, uint256 id, uint64 fee, bool enabled);

    constructor(
        address _governance,
        address _operator,
        address _feeTo
    ) {
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, _governance);
        _setupRole(OPERATOR_ROLE, _operator);

        feeTo = _feeTo;
        emit FeeToSet(_feeTo);
    }

    function getFee(
        bytes32 _paymentTag,
        address _assetAddress,
        uint256 _assetId,
        uint256 totalAmount
    ) public view override returns (address, uint256) {
        FeeOverride memory afo = assetFeeOverride[_assetAddress][_assetId];

        if (afo.enabled) {
            return (feeTo, (totalAmount * afo.fee) / 10000);
        }

        FeeOverride memory cfo = collectionFeeOverride[_assetAddress];

        if (cfo.enabled) {
            return (feeTo, (totalAmount * cfo.fee) / 10000);
        }

        return (feeTo, (totalAmount * baseFee[_paymentTag]) / 10000);
    }

    function getFeeAddress() public view returns (address) {
        return feeTo;
    }

    function getFeeBase(
        bytes32 _paymentTag,
        address _assetAddress,
        uint256 _assetId,
        uint256 totalAmount
    ) public view returns (uint256) {
        FeeOverride memory afo = assetFeeOverride[_assetAddress][_assetId];

        if (afo.enabled) {
            return (totalAmount * afo.fee) / 10000;
        }

        FeeOverride memory cfo = collectionFeeOverride[_assetAddress];

        if (cfo.enabled) {
            return (totalAmount * cfo.fee) / 10000;
        }

        return (totalAmount * baseFee[_paymentTag]) / 10000;
    }

    function setFeeTo(address _feeTo) external onlyRole(OPERATOR_ROLE) {
        require(_feeTo != address(0), "FeeM::setFeeTo: invalid");
        feeTo = _feeTo;

        emit FeeToSet(_feeTo);
    }

    function setBaseFee(bytes32 _paymentTag, uint64 _fee)
        external
        onlyRole(OPERATOR_ROLE)
    {
        baseFee[_paymentTag] = _fee;

        emit BaseFeeSet(_paymentTag, _fee);
    }

    function setCollectionFeeOverride(
        address _tokenAddress,
        FeeOverride memory cfo
    ) external onlyRole(OPERATOR_ROLE) {
        require(_tokenAddress != address(0), "FeeM::setCFeeOverride: invalid");
        collectionFeeOverride[_tokenAddress] = cfo;

        emit CollectionFeeOverride(_tokenAddress, cfo.fee, cfo.enabled);
    }

    function setAssetFeeOverride(
        address _tokenAddress,
        uint256 assetId,
        FeeOverride memory afo
    ) external onlyRole(OPERATOR_ROLE) {
        require(_tokenAddress != address(0), "FeeM::setAFeeOverride: invalid");
        assetFeeOverride[_tokenAddress][assetId] = afo;

        emit AssetFeeOverride(_tokenAddress, assetId, afo.fee, afo.enabled);
    }
}
