//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

contract HasDefaultableCompositeTokenURI {
    struct URISettings {
        string customTokenURIBase;
        string customCompositeTokenURIBase;
        bool useCompositeURI;
    }

    string private constant SEPARATOR = "/";

    string public defaultTokenURI;
    string public globalTokenURIBase;
    string public globalCompositeTokenURIBase;

    // Optional mapping for token URIs to override the original scheme
    mapping(uint256 => URISettings) private _uriSettings;

    constructor(string memory _defaultTokenURI) {
        defaultTokenURI = _defaultTokenURI;
    }

    function _baseTokenURI(uint256 _id) internal view returns (string memory) {
        URISettings memory uriSettings = _uriSettings[_id];

        if (uriSettings.useCompositeURI) {
            if (
                bytes(uriSettings.customCompositeTokenURIBase).length > 0 ||
                bytes(globalCompositeTokenURIBase).length > 0
            ) {
                return string(_compositeTokenURIBase(_id));
            }
        }

        if (bytes(uriSettings.customTokenURIBase).length > 0) {
            return uriSettings.customTokenURIBase;
        }

        if (bytes(globalTokenURIBase).length > 0) {
            return globalTokenURIBase;
        }

        return "";
    }

    /**
     * @dev This makes sure that a metadata is returned at all times, no matter the case
     */
    function _tokenURI(uint256 _id) internal view returns (string memory) {
        string memory chosenURIBase = _baseTokenURI(_id);

        if (bytes(chosenURIBase).length > 0) {
            return
                string(
                    abi.encodePacked(
                        chosenURIBase,
                        SEPARATOR,
                        uint256ToString(_id)
                    )
                );
        }

        return defaultTokenURI;
    }

    function _originalURI(uint256 _id) internal view returns (string memory) {
        URISettings memory uriSettings = _uriSettings[_id];

        if (bytes(uriSettings.customTokenURIBase).length > 0) {
            return uriSettings.customTokenURIBase;
        }

        if (bytes(globalTokenURIBase).length > 0) {
            return globalTokenURIBase;
        }

        return defaultTokenURI;
    }

    function _compositeTokenURIBase(uint256 _id)
        internal
        view
        returns (string memory)
    {
        string memory customCURIB = _uriSettings[_id]
            .customCompositeTokenURIBase;
        string memory chosenURIBase;

        if (bytes(customCURIB).length > 0) {
            chosenURIBase = customCURIB;
        } else {
            chosenURIBase = globalCompositeTokenURIBase;
        }

        uint256 cid;
        assembly {
            cid := chainid()
        }

        return
            string(
                abi.encodePacked(
                    chosenURIBase,
                    SEPARATOR,
                    uint256ToString(cid),
                    SEPARATOR,
                    addressToHexBytes(address(this))
                )
            );
    }

    function _tokenURIWithBase(uint256 _id)
        internal
        view
        returns (string memory)
    {
        return
            string(abi.encodePacked(globalTokenURIBase, uint256ToString(_id)));
    }

    function _setUseCompositeURI(uint256 _id, bool _useComposite) internal {
        _uriSettings[_id].useCompositeURI = _useComposite;
    }

    function _setGlobalTokenURIBase(string memory _globalTokenURIBase)
        internal
    {
        globalTokenURIBase = _globalTokenURIBase;
    }

    function _setCustomTokenURIBase(
        uint256 _id,
        string memory _customTokenURIBase
    ) internal {
        _uriSettings[_id].customTokenURIBase = _customTokenURIBase;
    }

    function _setGlobalCompositeTokenURIBase(
        string memory _globalCompositeTokenURIBase
    ) internal {
        globalCompositeTokenURIBase = _globalCompositeTokenURIBase;
    }

    function _setCustomCompositeTokenURIBase(
        uint256 _id,
        string memory _customCompositeTokenURIBase
    ) internal {
        _uriSettings[_id]
            .customCompositeTokenURIBase = _customCompositeTokenURIBase;
    }

    function _setDefaultTokenURI(string memory _defaultTokenURI) internal {
        defaultTokenURI = _defaultTokenURI;
    }

    function uint256ToString(uint256 value)
        private
        pure
        returns (string memory)
    {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function addressToHexBytes(address _address)
        internal
        pure
        returns (bytes memory)
    {
        uint160 _value = uint160(_address);

        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";

        bytes16 hexSymbols = bytes16("0123456789abcdef");

        for (uint256 i = 41; i > 1; --i) {
            buffer[i] = hexSymbols[_value & 0xf];
            _value >>= 4;
        }
        require(_value == 0, "Strings: hex length insufficient");
        return buffer;
    }
}
