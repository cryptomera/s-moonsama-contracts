//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "../opensea/ProxyRegistry.sol";

contract HasProxyRegistry {
    using Address for address;

    ProxyRegistry public proxyRegistry;

    constructor(address _proxyRegistryAddress) {
        _updateProxyRegistryAddress(_proxyRegistryAddress);
    }

    function isProxy(address _address, address _operator)
        public
        view
        returns (bool)
    {
        if (address(proxyRegistry).isContract()) {
            try proxyRegistry.proxies(_address) returns (
                OwnableDelegateProxy _proxy
            ) {
                return address(_proxy) == _operator;
            } catch {}
        }
        return false;
    }

    function _updateProxyRegistryAddress(address _proxyRegistryAddress)
        internal
    {
        proxyRegistry = ProxyRegistry(_proxyRegistryAddress);
    }
}
