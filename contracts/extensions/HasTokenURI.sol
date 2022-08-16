//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "../libraries/StringLibrary.sol";

contract HasTokenURI {
    string public tokenURIPrefix;
    string public tokenURIPostfix;

    // Optional mapping for token URIs to override the original scheme
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory _tokenURIPrefix, string memory _tokenURIPostfix) {
        tokenURIPrefix = _tokenURIPrefix;
        tokenURIPostfix = _tokenURIPostfix;
    }

    function uriScheme(uint256 _id) external view returns (string memory) {
        if (bytes(_tokenURIs[_id]).length > 0) {
            return _tokenURIs[_id];
        }

        return
            string(abi.encodePacked(tokenURIPrefix, "{id}", tokenURIPostfix));
    }

    /**
     * @dev Returns an URI for a given token ID.
     * Throws if the token ID does not exist. May return an empty string.
     * @param _id uint256 ID of the token to query
     */
    function _tokenURI(uint256 _id) internal view returns (string memory) {
        if (bytes(_tokenURIs[_id]).length > 0) {
            return _tokenURIs[_id];
        }

        string memory stringId = StringLibrary.uint2str(_id);

        return
            string(abi.encodePacked(tokenURIPrefix, stringId, tokenURIPostfix));
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param _id uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setCustomTokenURI(uint256 _id, string memory _uri) internal {
        _tokenURIs[_id] = _uri;
    }

    function _setTokenURIPrefix(string memory _tokenURIPrefix) internal {
        tokenURIPrefix = _tokenURIPrefix;
    }

    function _setTokenURIPostfix(string memory _tokenURIPostfix) internal {
        tokenURIPostfix = _tokenURIPostfix;
    }

    function _clearCustomTokenURI(uint256 _id) internal {
        if (bytes(_tokenURIs[_id]).length != 0) {
            delete _tokenURIs[_id];
        }
    }
}
