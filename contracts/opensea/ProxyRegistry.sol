//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
