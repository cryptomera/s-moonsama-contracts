//SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IERC2981.sol";
import "./interfaces/ITransferListener.sol";
import "./interfaces/IPermissionRegistry.sol";
import "./interfaces/IPaymentProcessorV1.sol";
import "./interfaces/IFeeManager.sol";

import "./extensions/HasProxyRegistry.sol";

import "./boringcrypto/BoringBatchable.sol";
import "./openzeppelin/ERC721Enumerable.sol";
import "./openzeppelin/ERC721Burnable.sol";

import "./DomainV1.sol";

contract ShowdownAuction is
    Context,
    AccessControlEnumerable,
    BoringBatchable,
    ReentrancyGuardUpgradeable,
    DomainV1
{
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AUCTION_CREATOR_ROLE =
        keccak256("AUCTION_CREATOR_ROLE");

    struct Auction {
        address maker;
        uint256 currentBidAmount;
        address taker;
        uint256 end;
    }

    mapping(address => mapping(uint256 => Auction)) public ongoingAuction;

    uint256 public auctionShowdownThreshold;
    uint256 public auctionShowdownExtension;
    uint256 public minBidStepAmount;

    bytes32 public paymentTagBid;
    bytes32 public paymentTagProtocolFee;
    bytes32 public paymentTagRoyaltyFee;
    bytes32 public paymentTagMakerFee;

    address public permissionRegistry;
    address public paymentProcessor;
    address public feeManager;

    // auction creation pause
    bool public auctionsEnabled;

    event AuctionCreated(
        address maker,
        address assetAddress,
        uint256 assetId,
        uint256 currentBidAmount,
        uint256 endTime
    );

    event AuctionSettled(
        address assetAddress,
        uint256 assetId,
        uint256 makerFeeAmount,
        uint256 royaltyFeeAmount,
        uint256 protocolFeeAmount
    );

    event AuctionBid(
        address assetAddress,
        uint256 assetId,
        uint256 bidPrice,
        address taker,
        uint256 newEndTime
    );

    event AuctionCancelled(address assetAddress, uint256 assetId);

    event ParamsSet(
        uint256 auctionShowdownThreshold,
        uint256 auctionShowdownExtension,
        uint256 minBidStepAmount
    );

    event PaymentTagsSet(
        bytes32 paymentTagBid,
        bytes32 paymentTagProtocolFee,
        bytes32 paymentTagRoyaltyFee,
        bytes32 paymentTagMakerFee
    );

    event PaymentProcessorSet(address paymentProcessor);
    event PermissionRegistrySet(address permissionRegistry);
    event FeeManagerSet(address feeManager);

    constructor(
        address _governance,
        address _operator,
        address _permissionRegistry,
        address _paymentProcessor,
        address _feeManager,
        uint256 _auctionShowdownThreshold,
        uint256 _auctionShowdownExtension,
        uint256 _minBidStepAmount
    ) {
        _setRoleAdmin(GOVERNANCE_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, GOVERNANCE_ROLE);
        _setRoleAdmin(AUCTION_CREATOR_ROLE, GOVERNANCE_ROLE);

        _setupRole(GOVERNANCE_ROLE, _governance);
        _setupRole(OPERATOR_ROLE, _operator);

        feeManager = _feeManager;
        permissionRegistry = _permissionRegistry;
        paymentProcessor = _paymentProcessor;

        auctionShowdownThreshold = _auctionShowdownThreshold;
        auctionShowdownExtension = _auctionShowdownExtension;
        minBidStepAmount = _minBidStepAmount;

        emit ParamsSet(
            _auctionShowdownThreshold,
            _auctionShowdownExtension,
            _minBidStepAmount
        );
        emit FeeManagerSet(_feeManager);
        emit PaymentProcessorSet(_paymentProcessor);
        emit PermissionRegistrySet(_permissionRegistry);
    }

    receive() external payable {}

    fallback() external payable {}

    // ADMIN FUNCTIONS

    function setAuctionsEnabled(bool _enabled)
        external
        onlyRole(OPERATOR_ROLE)
    {
        auctionsEnabled = _enabled;
    }

    function setParams(
        uint256 _auctionShowdownThreshold,
        uint256 _auctionEndExtension,
        uint256 _minBidStepAmount
    ) external onlyRole(OPERATOR_ROLE) {
        auctionShowdownThreshold = _auctionShowdownThreshold;
        auctionShowdownExtension = _auctionEndExtension;
        minBidStepAmount = _minBidStepAmount;

        emit ParamsSet(
            _auctionShowdownThreshold,
            _auctionEndExtension,
            _minBidStepAmount
        );
    }

    function setPaymentTags(
        bytes32 _paymentTagBid,
        bytes32 _paymentTagProtocolFee,
        bytes32 _paymentTagRoyaltyFee,
        bytes32 _paymentTagMakerFee
    ) external onlyRole(OPERATOR_ROLE) {
        paymentTagBid = _paymentTagBid;
        paymentTagProtocolFee = _paymentTagProtocolFee;
        paymentTagRoyaltyFee = _paymentTagRoyaltyFee;
        paymentTagMakerFee = _paymentTagMakerFee;

        emit PaymentTagsSet(
            _paymentTagBid,
            _paymentTagProtocolFee,
            _paymentTagRoyaltyFee,
            _paymentTagMakerFee
        );
    }

    function setPaymentProcessor(address _paymentProcessor)
        external
        onlyRole(OPERATOR_ROLE)
    {
        paymentProcessor = _paymentProcessor;
        emit PaymentProcessorSet(_paymentProcessor);
    }

    function setPermissionRegistry(address _permissionRegistry)
        external
        onlyRole(OPERATOR_ROLE)
    {
        permissionRegistry = _permissionRegistry;
        emit PermissionRegistrySet(_permissionRegistry);
    }

    function setFeeManager(address _feeManager)
        external
        onlyRole(OPERATOR_ROLE)
    {
        feeManager = _feeManager;
        emit FeeManagerSet(_feeManager);
    }

    function cancelAuctionAdmin(address _assetAddress, uint256 _assetId)
        external
    {
        address _sender = _msgSender();
        require(
            hasRole(OPERATOR_ROLE, _sender) ||
                hasRole(AUCTION_CREATOR_ROLE, _sender),
            "SA::cancel: forbidden"
        );

        Auction memory auction = ongoingAuction[_assetAddress][_assetId];

        require(_auctionExists(auction), "SA::cancel: nonexistant");

        address _taker = auction.taker;

        _deleteAuction(_assetAddress, _assetId);

        // Redeem payment tokens for bidder
        if (_taker != auction.maker) {
            // last bidder gets payment back
            IPaymentProcessorV1(paymentProcessor).charge(
                address(paymentProcessor),
                address(paymentProcessor),
                auction.currentBidAmount,
                0,
                _taker,
                paymentTagBid,
                false
            );
        }

        // Release asset to maker
        IPaymentProcessorV1(paymentProcessor).transferNonFungibleAsset(
            _assetAddress,
            paymentProcessor,
            auction.maker,
            _assetId
        );

        emit AuctionCancelled(_assetAddress, _assetId);
    }

    function create(
        address _makerAddress,
        address _assetAddress,
        uint256 _assetId,
        uint256 _reservePrice,
        uint256 _endTimestamp
    ) external nonReentrant onlyRole(AUCTION_CREATOR_ROLE) {
        require(auctionsEnabled, "SA::createAuction: disabled");
        require(
            !auctionExists(_assetAddress, _assetId),
            "SA::createAuction: already"
        );

        require(
            IPermissionRegistry(permissionRegistry).checkAuctionAllowed(
                _assetAddress,
                _assetId,
                _makerAddress,
                paymentTagBid
            ),
            "SA::createAuction: unauthorized"
        );

        require(
            _endTimestamp > block.timestamp + auctionShowdownThreshold,
            "SA::createAuction: too short"
        );

        // store auction
        ongoingAuction[_assetAddress][_assetId] = Auction({
            maker: _makerAddress,
            currentBidAmount: _reservePrice,
            taker: _makerAddress,
            end: _endTimestamp
        });

        // escrow the NFT
        IPaymentProcessorV1(paymentProcessor).transferNonFungibleAsset(
            _assetAddress,
            _makerAddress,
            address(paymentProcessor),
            _assetId
        );

        emit AuctionCreated(
            _makerAddress,
            _assetAddress,
            _assetId,
            _reservePrice,
            _endTimestamp
        );
    }

    function bid(
        address _assetAddress,
        uint256 _assetId,
        uint256 _bidAmount
    ) external payable nonReentrant {
        address _taker = _msgSender();

        require(
            IPermissionRegistry(permissionRegistry).checkBidAllowed(
                _assetAddress,
                _assetId,
                _taker
            ),
            "SA::bid: unauthorized"
        );

        Auction memory auction = ongoingAuction[_assetAddress][_assetId];

        require(_auctionExists(auction), "SA::bid: nonexistant");
        require(block.timestamp < auction.end, "SA::bid: finished");
        require(auction.maker != _taker, "SA::bid: cannot bid own");
        require(
            _bidAmount >= (auction.currentBidAmount + minBidStepAmount),
            "SA::bid: amount invalid"
        );

        uint256 endTime = auction.end;
        // Bonus: if someone bids in the showdown period, the auction end extends
        if (block.timestamp >= (endTime - auctionShowdownThreshold)) {
            endTime = endTime + auctionShowdownExtension;
            ongoingAuction[_assetAddress][_assetId].end = endTime;
        }

        address prevTaker = auction.taker;

        ongoingAuction[_assetAddress][_assetId].taker = _taker;
        ongoingAuction[_assetAddress][_assetId].currentBidAmount = _bidAmount;
        if (auction.maker != prevTaker) {
            // prev bidder gets it back
            IPaymentProcessorV1(paymentProcessor).charge(
                address(paymentProcessor),
                address(paymentProcessor),
                auction.currentBidAmount,
                0,
                auction.taker,
                paymentTagBid,
                false
            );
        }

        // new bidder escrows
        IPaymentProcessorV1(paymentProcessor).charge{value: msg.value}(
            _taker,
            _taker,
            _bidAmount,
            0,
            address(paymentProcessor),
            paymentTagBid,
            true
        );

        emit AuctionBid(_assetAddress, _assetId, _bidAmount, _taker, endTime);
    }

    function settle(address _assetAddress, uint256 _assetId)
        external
        nonReentrant
    {
        Auction memory auction = ongoingAuction[_assetAddress][_assetId];

        require(_auctionExists(auction), "SA::settle: nonexistant");

        //require(auction.taker == claimer || auction.maker == claimer || hasRole(OPERATOR_ROLE, claimer), "SA::settle: unauthorized");
        require(block.timestamp >= auction.end, "SA::settle: auction ongoing");

        uint256[] memory _amounts = new uint256[](3);
        address[] memory _addresses = new address[](3);
        uint256 makerFeeAmount = auction.currentBidAmount;
        uint256 protocolFeeAmount;
        uint256 royaltyFeeAmount;

        if (auction.maker != auction.taker) {
            // get protocol fee
            (address pFeeTo, uint256 pFeeAmount) = IFeeManager(feeManager)
                .getFee(
                    paymentTagProtocolFee,
                    _assetAddress,
                    _assetId,
                    auction.currentBidAmount
                );

            // transfer protocol fee to team wallet
            if (pFeeAmount > 0) {
                makerFeeAmount -= pFeeAmount;
                protocolFeeAmount = pFeeAmount;
                _amounts[0] = pFeeAmount;
                _addresses[0] = pFeeTo;
            }

            //get royalty fee
            try
                IERC2981(_assetAddress).royaltyInfo(
                    _assetId,
                    auction.currentBidAmount
                )
            returns (address _rreceiver, uint256 _rfee) {
                // transfer royalty fee to creator
                if (_rfee > 0) {
                    _amounts[1] = _rfee;
                    _addresses[1] = _rreceiver;

                    makerFeeAmount -= _rfee;
                    royaltyFeeAmount = _rfee;
                }
            } catch {}
        }

        // transfer remainder of payment to maker
        _amounts[2] = makerFeeAmount;
        _addresses[2] = auction.maker;

        bytes32[] memory paymentTags = new bytes32[](3);
        paymentTags[0] = paymentTagProtocolFee;
        paymentTags[1] = paymentTagRoyaltyFee;
        paymentTags[2] = paymentTagMakerFee;
        IPaymentProcessorV1(paymentProcessor).chargeBatch(
            address(paymentProcessor),
            address(paymentProcessor),
            _amounts,
            new uint256[](3),
            _addresses,
            paymentTags,
            true
        );

        IPaymentProcessorV1(paymentProcessor).transferNonFungibleAsset(
            _assetAddress,
            paymentProcessor,
            auction.taker,
            _assetId
        );

        _deleteAuction(_assetAddress, _assetId);

        emit AuctionSettled(
            _assetAddress,
            _assetId,
            makerFeeAmount,
            royaltyFeeAmount,
            protocolFeeAmount
        );
    }

    function auctionExists(address _assetAddress, uint256 _assetId)
        public
        view
        returns (bool)
    {
        return _auctionExists(ongoingAuction[_assetAddress][_assetId]);
    }

    function setAllowance(
        address _assetAddress,
        uint256 _assetId,
        bytes32 _assetType,
        bool _allow
    ) public onlyRole(OPERATOR_ROLE) {
        if (_assetType == "ERC20") {
            if (_allow) {
                IERC20(_assetAddress).approve(
                    paymentProcessor,
                    type(uint256).max
                );
            } else {
                IERC20(_assetAddress).approve(paymentProcessor, 0);
            }
            return;
        }

        if (_assetType == "ERC721") {
            IERC721(_assetAddress).setApprovalForAll(paymentProcessor, _allow);
            return;
        }
    }

    // PRIVATE HELPERS

    function _auctionExists(Auction memory _auction)
        private
        pure
        returns (bool)
    {
        return _auction.maker != address(0);
    }

    function _deleteAuction(address _assetAddress, uint256 _assetId) private {
        delete ongoingAuction[_assetAddress][_assetId];
    }
}
