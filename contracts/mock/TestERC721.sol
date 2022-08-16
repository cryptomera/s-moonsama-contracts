//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../extensions/HasSecondarySaleFee.sol";

contract TestERC721 is ERC721("test", "TST"), HasSecondarySaleFee {
    function mint(address to, uint256 tokenId) public returns (bool) {
        _mint(to, tokenId);
        return true;
    }

    function setFee(address payable _feeRecipient, uint256 _feeValueBps)
        external
    {
        _setSecondarySaleFee(_feeRecipient, _feeValueBps);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, HasSecondarySaleFee)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
