//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./openzeppelin/AccessControlEnumerableUpgradeable.sol";
import "./openzeppelin/UUPSUpgradeable.sol";

import "./interfaces/IERC20Burnable.sol";
import "./interfaces/IPaymentRegistry.sol";
import "./interfaces/IPaymentListener.sol";

import "./PaymentProcessorBase.sol";

contract PaymentProcessorV1 is
    UUPSUpgradeable,
    AccessControlEnumerableUpgradeable,
    PaymentProcessorBase
{
    modifier withMsgValueCounter() {
        if (msg.value > 0) {
            msgValueCounter = msg.value;
            _;
            delete msgValueCounter;
        } else {
            _;
        }
    }

    function initialize(
        address _governor,
        address _operator,
        address _paymentRegistry
    ) external virtual initializer {
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(CASHIER_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, _governor);
        _setupRole(OPERATOR_ROLE, _operator);

        paymentRegistry = IPaymentRegistry(_paymentRegistry);
    }

    function charge(
        address _chargedAddress,
        address _invoicedAddress,
        uint256 _amountTransferred,
        uint256 _amountBurned,
        address _transferRecipient,
        bytes32 _paymentTag,
        bool _fireEvent
    ) external payable withMsgValueCounter {
        address _cashier = _msgSender();

        require(
            hasRole(CASHIER_ROLE, _cashier) || hasRole(OPERATOR_ROLE, _cashier),
            "PP::chargeE: forbidden"
        );

        _chargeWNativeCore(
            _cashier,
            _chargedAddress,
            _amountTransferred,
            _amountBurned,
            _transferRecipient,
            _paymentTag
        );

        if (_fireEvent) {
            emit Charged(
                _amountTransferred,
                _amountBurned,
                _paymentTag,
                _transferRecipient,
                _cashier,
                _invoicedAddress
            );
        }
    }

    function chargeBatch(
        address _chargedAddress,
        address _invoicedAddress,
        uint256[] memory _amountsTransferred,
        uint256[] memory _amountsBurned,
        address[] memory _transferRecipients,
        bytes32[] memory _paymentTags,
        bool _fireEvent
    ) external payable withMsgValueCounter {
        address _cashier = _msgSender();
        require(
            hasRole(CASHIER_ROLE, _cashier) || hasRole(OPERATOR_ROLE, _cashier),
            "PP::charge: forbidden"
        );

        uint256 _length = _transferRecipients.length;

        for (uint256 i = 0; i < _transferRecipients.length; i++) {
            _chargeWNativeCore(
                _cashier,
                _chargedAddress,
                _amountsTransferred[i],
                _amountsBurned[i],
                _transferRecipients[i],
                _paymentTags[i]
            );
        }

        if (_fireEvent) {
            if (_length > 1) {
                emit ChargedBatch(
                    _amountsTransferred,
                    _amountsBurned,
                    _paymentTags,
                    _transferRecipients,
                    _cashier,
                    _invoicedAddress
                );
            } else {
                emit Charged(
                    _amountsTransferred[0],
                    _amountsBurned[0],
                    _paymentTags[0],
                    _transferRecipients[0],
                    _cashier,
                    _invoicedAddress
                );
            }
        }
    }

    function _chargeWNativeCore(
        address _cashier,
        address _chargedAddress,
        uint256 _amountTransferred,
        uint256 _amountBurned,
        address _transferRecipient,
        bytes32 _paymentTag
    ) private {
        {
            address _paymentToken = paymentRegistry.getPaymentToken(
                _paymentTag
            );
            require(_paymentToken != address(0), "PP::charge: invalid tag");

            if (_amountTransferred == 0 && _amountBurned == 0) {
                return;
            }

            // ERC20 Transfer
            if (_paymentToken != PAYMENT_TOKEN_NATIVE) {
                if (_amountTransferred > 0) {
                    if (_chargedAddress == address(this)) {
                        IERC20Burnable(_paymentToken).transfer(
                            _transferRecipient,
                            _amountTransferred
                        );
                    } else {
                        IERC20Burnable(_paymentToken).transferFrom(
                            _chargedAddress,
                            _transferRecipient,
                            _amountTransferred
                        );
                    }
                }

                if (_amountBurned > 0) {
                    if (_chargedAddress == address(this)) {
                        IERC20Burnable(_paymentToken).burn(_amountBurned);
                    } else {
                        IERC20Burnable(_paymentToken).burnFrom(
                            _chargedAddress,
                            _amountBurned
                        );
                    }
                }
                // native transfer without callback
            } else {
                if (_amountTransferred > 0) {
                    if (_chargedAddress != address(this)) {
                        require(
                            msgValueCounter >= _amountTransferred,
                            "PP::charge: insufficient native"
                        );
                        msgValueCounter -= _amountTransferred;
                    }

                    if (_transferRecipient != address(this)) {
                        (bool success, ) = _transferRecipient.call{
                            value: _amountTransferred
                        }("");
                        require(success, "PP::charge: failed native tx");
                    }
                }

                if (_amountBurned > 0) {
                    if (_chargedAddress != address(this)) {
                        require(
                            msgValueCounter >= _amountBurned,
                            "PP::charge: insufficient native"
                        );
                        msgValueCounter -= _amountBurned;
                    }
                    (bool success, ) = address(0).call{value: _amountBurned}(
                        ""
                    );
                    require(success, "PP::charge: failed native burn");
                }
            }
        }

        if (address(paymentListener) != address(0)) {
            try
                paymentListener.onPayment(
                    _chargedAddress,
                    _amountTransferred,
                    _amountBurned,
                    _transferRecipient,
                    _paymentTag,
                    _cashier
                )
            {} catch {}
        }
    }

    function transferNonFungibleAsset(
        address _assetAddress,
        address _from,
        address _to,
        uint256 _assetId
    ) external onlyRole(CASHIER_ROLE) {
        IERC721(_assetAddress).transferFrom(_from, _to, _assetId);
    }

    function setPaymentRegistry(address _paymentRegistry)
        external
        onlyRole(OPERATOR_ROLE)
    {
        paymentRegistry = IPaymentRegistry(_paymentRegistry);

        emit PaymentRegistrySet(_paymentRegistry);
    }

    function setPaymentListener(address _paymentListener)
        external
        onlyRole(OPERATOR_ROLE)
    {
        paymentListener = IPaymentListener(_paymentListener);

        emit PaymentListenerSet(_paymentListener);
    }

    function getPaymentToken(bytes32 _paymentTag)
        external
        view
        returns (address)
    {
        return paymentRegistry.getPaymentToken(_paymentTag);
    }

    /**
     * @dev If someone fucks up and sends tokens here
     */
    function drain(
        address _token,
        address payable _target,
        uint256 _amount
    ) external onlyRole(GOVERNANCE_ROLE) returns (bool) {
        if (_token == address(0)) {
            (bool success, ) = _target.call{value: _amount}("");
            return success;
        }

        IERC20Burnable(_token).transfer(_target, _amount);
        return true;
    }

    function VERSION() external view returns (uint8) {
        return _version();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(GOVERNANCE_ROLE)
    {}
}
