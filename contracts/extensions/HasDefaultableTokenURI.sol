//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

contract HasDefaultableTokenURI {
    string public defaultTokenURI;

    // Optional mapping for token URIs to override the original scheme
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory _defaultTokenURI) {
        defaultTokenURI = _defaultTokenURI;
    }

    function uriScheme(uint256 _id) external view returns (string memory) {
        if (bytes(_tokenURIs[_id]).length > 0) {
            return _tokenURIs[_id];
        }

        return defaultTokenURI;
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

        return defaultTokenURI;
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

    function _setDefaultTokenURI(string memory _defaultTokenURI) internal {
        defaultTokenURI = _defaultTokenURI;
    }
}
