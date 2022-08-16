//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./boringcrypto/BoringBatchable.sol";

import "./interfaces/IInitializableCollection.sol";

import "./TemplateRegistry.sol";

contract RaresamaCollectionFactoryV1 is AccessControl, BoringBatchable {
    using Address for address;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    bytes32 public constant TEMPLATE_TAG_ERC721 = "ERC721";
    bytes32 public constant TEMPLATE_TAG_ERC1155 = "ERC1155";

    address[] internal collections;

    TemplateRegistry public templateRegistry;

    uint256 public constant VERSION = 1;

    event CollectionAdded(
        uint256 id,
        bytes32 template,
        address collectionAddress
    );
    event TemplateRegistrySet(address newTemplateRegistry);

    constructor(
        address _templateRegistry,
        address governor,
        address admin
    ) {
        // we start at index 1
        // id 0 is invalid
        collections.push(address(0));

        templateRegistry = TemplateRegistry(_templateRegistry);

        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, governor);
        _setupRole(OPERATOR_ROLE, admin);

        emit TemplateRegistrySet(_templateRegistry);
    }

    function getCollection(uint256 _id) external view returns (address) {
        require(exists(_id), "RSCF::getCollection: nonexistant");
        return collections[_id];
    }

    function getLastCollection() external view returns (address) {
        return collections[getLastCollectionId()];
    }

    function getCollections() external view returns (address[] memory) {
        return collections;
    }

    function getLastCollectionId() public view returns (uint256) {
        return collections.length > 0 ? collections.length - 1 : 0;
    }

    function exists(uint256 _id) public view returns (bool) {
        return _id < collections.length && _id != 0;
    }

    function totalSupply() external view returns (uint256) {
        return collections.length > 0 ? collections.length - 1 : 0;
    }

    function setTemplateRegistry(address _templateRegistry)
        external
        onlyRole(OPERATOR_ROLE)
    {
        templateRegistry = TemplateRegistry(_templateRegistry);

        emit TemplateRegistrySet(_templateRegistry);
    }

    function create(
        bytes32 _templateTag,
        address owner,
        address admin,
        address minter,
        string memory name,
        string memory symbol,
        uint8 _decimals,
        string memory _contractURI,
        string memory _defaultTokenURI
    ) external onlyRole(OPERATOR_ROLE) returns (uint256, address) {
        address _collection;

        // stack too deep
        {
            address _collectionTemplate = templateRegistry.getTemplate(
                _templateTag
            );

            _collection = Clones.clone(_collectionTemplate);

            IInitializableCollection(_collection).initialize(
                owner,
                admin,
                minter,
                name,
                symbol,
                _decimals,
                _contractURI,
                _defaultTokenURI,
                address(0)
            );
        }

        collections.push(_collection);

        uint256 _id = collections.length - 1;

        emit CollectionAdded(_id, _templateTag, _collection);
        return (_id, _collection);
    }

    function createNonInit(bytes32 _templateTag)
        external
        onlyRole(OPERATOR_ROLE)
        returns (uint256, address)
    {
        address _collectionTemplate = templateRegistry.getTemplate(
            _templateTag
        );

        address _collection = Clones.clone(_collectionTemplate);

        collections.push(_collection);

        uint256 _id = collections.length - 1;

        emit CollectionAdded(_id, _templateTag, _collection);
        return (_id, _collection);
    }

    function addManual(bytes32 _templateTag, address _collection)
        external
        onlyRole(OPERATOR_ROLE)
        returns (uint256, address)
    {
        uint256 id = collections.length;
        collections.push(_collection);

        emit CollectionAdded(id, _templateTag, _collection);

        return (id, _collection);
    }
}
