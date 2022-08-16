//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

contract HasReusableIds {
    uint256[] public reusableIds;

    function _storeId(uint256 _id) internal returns (uint256) {
        reusableIds.push(_id);
        return reusableIds.length - 1;
    }

    function _reUseId() internal returns (uint256 _id) {
        if (reusableIds.length > 0) {
            _id = reusableIds[reusableIds.length - 1];
            reusableIds.pop();
        }
    }
}
