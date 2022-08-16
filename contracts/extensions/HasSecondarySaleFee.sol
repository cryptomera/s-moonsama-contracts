//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "../interfaces/IERC2981.sol";

abstract contract HasSecondarySaleFee is IERC2981, ERC165 {
    address payable internal feeRecipient;
    uint256 internal feeValueBps;

    event SecondarySaleFee(address indexed feeRecipient, uint256 feeValueBps);

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == _INTERFACE_ID_ERC2981 ||
            super.supportsInterface(interfaceId);
    }

    function secondarySaleFee(
        uint256 /*id*/
    ) public view returns (address, uint256) {
        return (feeRecipient, feeValueBps);
    }

    function royaltyInfo(
        uint256, /*_tokenId*/
        uint256 _salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        receiver = feeRecipient;
        royaltyAmount = (feeValueBps * _salePrice) / 10000;
    }

    function _setSecondarySaleFee(address payable _recipient, uint256 _valueBps)
        internal
        virtual
    {
        feeRecipient = _recipient;
        feeValueBps = _valueBps;

        emit SecondarySaleFee(_recipient, _valueBps);
    }
}
