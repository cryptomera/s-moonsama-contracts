// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract TestERC20 is ERC20, AccessControlEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address _minter) ERC20("TestERC20", "MOCK") {
        _setupRole(MINTER_ROLE, _minter);
    }

    function mint(uint256 _amount, address _to) external onlyRole(MINTER_ROLE) {
        require(_amount > 0, "Amount too low");
        _mint(_to, _amount);
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        super._beforeTokenTransfer(_from, _to, _amount);
    }
}
