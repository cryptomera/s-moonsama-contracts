//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./boringcrypto/BoringBatchable.sol";

contract TemplateRegistry is AccessControlEnumerable, BoringBatchable {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(bytes32 => address) public template;

    event TemplateSet(bytes32 templateTag, address newTemplateAddress);

    constructor(address _governance, address _operator) {
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, _governance);
        _setupRole(OPERATOR_ROLE, _operator);
    }

    function getTemplate(bytes32 _templateTag) external view returns (address) {
        return template[_templateTag];
    }

    function setTemplate(bytes32 _templateTag, address _templateAddress)
        external
        onlyRole(OPERATOR_ROLE)
    {
        template[_templateTag] = _templateAddress;

        emit TemplateSet(_templateTag, _templateAddress);
    }
}
