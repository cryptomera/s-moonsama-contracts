//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IShowdownAuction {
    function chargeNativeTransfer(address _to, uint256 _amountToTransfer)
        external
        payable;
}
