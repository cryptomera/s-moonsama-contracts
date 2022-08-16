//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IInitializableCollection {
    function initialize(
        address owner,
        address admin,
        address minter,
        string memory name,
        string memory symbol,
        uint8 _decimals,
        string memory _contractURI,
        string memory _defaultTokenURI,
        address _proxyRegistryAddress
    ) external;
}
