import { ethers, upgrades } from "hardhat";
import { expect } from "chai";

import { ADDRESS_ZERO, ADDRESS_ONE } from "./utils";
import { BigNumber } from "ethers";

describe("scenarios", function () {
    before(async function () {
        this.RSC = await ethers.getContractFactory("RaresamaCollectionV1");

        this.SA = await ethers.getContractFactory("ShowdownAuction");

        this.signers = await ethers.getSigners();
        this.deployer = this.signers[0];
        this.dev = this.signers[1];
        this.alice = this.signers[2];
        this.bob = this.signers[3];
        this.carol = this.signers[4];
        this.protocolMultisig = this.signers[5];
        this.royaltyMultisig = this.signers[6];
        this.feeProocol = "200";
        this.feeRoyalty = "200";
        this.auctionShowdownThreshold = '10'
        this.auctionShowdownExtension = '10'
        this.minBidStepAmount = '10'

        this.paymentTagBid = ethers.utils.formatBytes32String(
            "SA_V1_BID"
        );
        this.paymentTagRoyaltyFee = ethers.utils.formatBytes32String(
            "SA_V1_ROYALTY"
        );
        this.paymentTagProtocolFee = ethers.utils.formatBytes32String(
            "SA_V1_PROTOCOL"
        );
        this.paymentTagMakerFee = ethers.utils.formatBytes32String(
            "SA_V1_MAKER"
        );

        this.FeeManager = await ethers.getContractFactory("FeeManager");
        this.PaymentRegistry = await ethers.getContractFactory("PaymentRegistry");
        this.PermissionRegistry = await ethers.getContractFactory("PermissionRegistry");
        this.PaymentProcessorV1 = await ethers.getContractFactory("PaymentProcessorV1");
        this.PaymentProcessorV1Dev = await ethers.getContractFactory("PaymentProcessorV1", this.dev);
        this.PaymentProcessorV2 = await ethers.getContractFactory("PaymentProcessorV2");
        this.PaymentProcessorV2Dev = await ethers.getContractFactory("PaymentProcessorV2", this.dev);
        this.BadPaymentProcessorV2Dev = await ethers.getContractFactory("BadPaymentProcessorV2", this.dev);
        this.ShowdownAuction = await ethers.getContractFactory("ShowdownAuction");
        this.Token = await ethers.getContractFactory("TestERC20")
        this.Nft = await ethers.getContractFactory("TestERC721")
    });

    beforeEach(async function () {
        // test ERC20 for payments
        this.paymentToken = await (
            await this.Token.deploy(this.dev.address)
        ).deployed();


        // test ERC721 for payments
        this.nft = await (
            await this.Nft.deploy()
        ).deployed();

        await (await this.nft.setFee(this.royaltyMultisig.address, '500')).wait()
        
        await this.nft.mint(this.alice.address, '1')
        await (await this.nft.mint(this.alice.address, '2')).wait()
        await (await this.nft.mint(this.alice.address, '3')).wait()

        // deploy Payment Registry
        this.preg = await this.PaymentRegistry.deploy(
            this.deployer.address,
            this.dev.address
        );
        await this.preg.deployed();


        // register payment tokens
        await this.preg
            .connect(this.dev)
            .setPaymentToken(this.paymentTagBid, ADDRESS_ONE);
        await this.preg
            .connect(this.dev)
            .setPaymentToken(this.paymentTagRoyaltyFee, ADDRESS_ONE);
        await this.preg
            .connect(this.dev)
            .setPaymentToken(this.paymentTagProtocolFee, ADDRESS_ONE);
        await this.preg
            .connect(this.dev)
            .setPaymentToken(this.paymentTagMakerFee, ADDRESS_ONE);

        // deploy proxy and initialize
        this.pp = await upgrades.deployProxy(this.PaymentProcessorV1, [this.dev.address, this.deployer.address, this.preg.address], {
            initializer: "initialize",
            kind: 'uups'
        });
        await this.pp.deployed()

    })

    it("version number is 1 initially", async function() {
        expect(await this.pp.VERSION()).to.equal(1)
    });

    it("can only be upgraded by governance", async function () {
        await expect(upgrades.upgradeProxy(this.pp, this.PaymentProcessorV2, {call: {fn: 'initialize2', args: []}, kind: 'uups'}))
            .to.be.revertedWith(`AccessControl: account ${this.deployer.address.toLowerCase()} is missing role 0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1`)

        this.ppdev = await this.PaymentProcessorV1Dev.attach(this.pp.address)

        this.ppdev = await upgrades.upgradeProxy(this.ppdev, this.PaymentProcessorV2Dev, {call: {fn: 'initialize2', args: []}, kind: 'uups'});
        expect(await this.ppdev.yolococo()).to.equal('yolococo')
        expect(await this.ppdev.VERSION()).to.equal(2)
    });

    it("cannot be initialized again", async function() {
        await expect(this.pp.connect(this.dev).initialize(ADDRESS_ZERO, ADDRESS_ZERO, ADDRESS_ZERO)).to.be.revertedWith('Initializable: contract is already initialized')
    });

    it("upgrade has to be versioned correctly", async function () {
        this.ppdev = await this.PaymentProcessorV1Dev.attach(this.pp.address)
        await expect(upgrades.upgradeProxy(this.ppdev, this.BadPaymentProcessorV2Dev, {call: {fn: 'initialize2', args: []}, kind: 'uups'}))
            .to.be.revertedWith(`Initializable: contract is already initialized`)
    });
})