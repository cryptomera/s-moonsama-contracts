//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface ITransferListener {
    function onTransfer(
        address _contractAddress,
        uint256 _tokenId,
        address _from,
        address _to,
        bytes calldata _extraData
    ) external view;
}
