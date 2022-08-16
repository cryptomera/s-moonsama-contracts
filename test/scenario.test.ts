import { ethers } from "hardhat";
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
        this.PaymentProcessor = await ethers.getContractFactory("PaymentProcessorV1");
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


        // deploy payment processor
        this.pp = await this.PaymentProcessor.deploy();
        await this.pp.deployed();

        await (await this.pp.initialize(
            this.deployer.address,
            this.dev.address,
            this.preg.address
        )).wait()


        // deploy fee manager & config
        this.fm = await this.FeeManager.deploy(
            this.deployer.address,
            this.dev.address,
            this.protocolMultisig.address
        )
        await (await this.fm.connect(this.dev).setBaseFee(this.paymentTagProtocolFee, '200')).wait()


        // deploy permission registry
        this.pr = await this.PermissionRegistry.deploy(
            this.dev.address,
            this.dev.address
        )
        await this.pr.deployed()


        // deploy showdown auction
        this.sa = await this.ShowdownAuction.deploy(
            this.deployer.address,
            this.dev.address,
            this.pr.address,
            this.pp.address,
            this.fm.address,
            this.auctionShowdownThreshold,
            this.auctionShowdownExtension,
            this.minBidStepAmount
        );
        await this.sa.deployed();
        
        // enable auctions & tags
        await (await this.sa.connect(this.dev).setAuctionsEnabled(true)).wait()
        await (await this.sa.connect(this.dev).setPaymentTags(
            this.paymentTagBid,
            this.paymentTagProtocolFee,
            this.paymentTagRoyaltyFee,
            this.paymentTagMakerFee
        )).wait()

        // permission sa in pp
        await (await this.pp.grantRole(
            await this.pp.CASHIER_ROLE(),
            this.sa.address
        )).wait()
    })

    it("complete auction scenario", async function () {

        const aliceOriginalBalance = await ethers.provider.getBalance(this.alice.address)
        const bobOriginalBalance = await ethers.provider.getBalance(this.bob.address)
        const carolOriginalBalance = await ethers.provider.getBalance(this.carol.address)
        const pOriginalBalance = await ethers.provider.getBalance(this.protocolMultisig.address)
        const rOriginalBalance = await ethers.provider.getBalance(this.royaltyMultisig.address)

        let initialBlocknumber = await ethers.provider.getBlockNumber()
        let block = await ethers.provider.getBlock(initialBlocknumber)
        
        await expect(this.sa.connect(this.alice).create(
            this.alice.address,
            this.nft.address,
            '1',
            '10',
            BigNumber.from(block.timestamp).add('20').toString()
        )).to.be.revertedWith(`AccessControl: account ${this.alice.address.toLowerCase()} is missing role 0xcfba8be83af357df8defaa5e92d4092d7061b755093a8b7649b2afc2929f5c65`);

        await (await this.sa.grantRole(
            await this.sa.AUCTION_CREATOR_ROLE(),
            this.alice.address
        )).wait()

        initialBlocknumber = await ethers.provider.getBlockNumber()
        block = await ethers.provider.getBlock(initialBlocknumber)

        await expect(this.sa.connect(this.alice).create(
            this.alice.address,
            this.nft.address,
            '1',
            '10',
            BigNumber.from(block.timestamp).add('20').toString()
        )).to.be.revertedWith(`ERC721: caller is not token owner nor approved`);

        await this.nft.connect(this.alice).setApprovalForAll(this.pp.address, true);

        initialBlocknumber = await ethers.provider.getBlockNumber()
        block = await ethers.provider.getBlock(initialBlocknumber)

        const originalTime = BigNumber.from(block.timestamp)
        const originalEndTime = originalTime.add('20')

        await expect(this.sa.connect(this.alice).create(
            this.alice.address,
            this.nft.address,
            '1',
            '10',
            originalEndTime.toString()
        )).to.emit(this.sa, 'AuctionCreated')
        .withArgs(this.alice.address, this.nft.address, '1', '10', originalEndTime.toString())

        expect(await this.nft.ownerOf('1')).to.equal(this.pp.address)

        // bid on own
        await expect(this.sa.connect(this.alice).bid(
            this.nft.address,
            '1',
            '100'
        )).to.be.revertedWith('SA::bid: cannot bid own')

        // bid on non existant
        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '2',
            '100'
        )).to.be.revertedWith('SA::bid: nonexistant')

        // bid lower
        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '1',
            '9'
        )).to.be.revertedWith('SA::bid: amount invalid')

        // bid higher but below treshold
        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '1',
            '19'
        )).to.be.revertedWith('SA::bid: amount invalid')

        // bid correctly, before showdown, but insufficient
        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '1',
            '21'
        )).to.be.revertedWith('PP::charge: insufficient native')

        // bid correctly, before showdown
        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '1',
            '21',
            {value: '21'}
        )).to.emit(this.sa, 'AuctionBid').withArgs(
            this.nft.address,
            '1',
            '21',
            this.bob.address,
            originalEndTime.toString()
        )

        expect(await ethers.provider.getBalance(this.pp.address)).to.equal('21')

        const bn = await ethers.provider.getBlockNumber()
        block = await ethers.provider.getBlock(bn)

        await ethers.provider.send('evm_increaseTime', [10]);

        // bid correctly, in showdown
        await expect(this.sa.connect(this.carol).bid(
            this.nft.address,
            '1',
            '100',
            {value: '100'}
        )).to.emit(this.sa, 'AuctionBid').withArgs(
            this.nft.address,
            '1',
            '100',
            this.carol.address,
            originalEndTime.add('10').toString()
        )

        expect(await ethers.provider.getBalance(this.pp.address)).to.equal('100')

        // tries settle before end
        await expect(this.sa.connect(this.carol).settle(
            this.nft.address,
            '1'
        )).to.be.revertedWith('SA::settle: auction ongoing')

        // tries bid after end
        await ethers.provider.send('evm_increaseTime', [100]);

        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '1',
            '1000'
        )).to.be.revertedWith('SA::bid: finished')

        // settles after end

        await expect(this.sa.connect(this.carol).settle(
            this.nft.address,
            '1'
        )).to.emit(this.sa, 'AuctionSettled').withArgs(
            this.nft.address,
            '1',
            '93',
            '5',
            '2'
        )
        
        expect(await this.nft.ownerOf('1')).to.equal(this.carol.address)
        expect(await ethers.provider.getBalance(this.pp.address)).to.equal('0')
        //expect(await ethers.provider.getBalance(this.alice.address)).to.equal(aliceOriginalBalance.add('93'))
        //expect(await ethers.provider.getBalance(this.bob.address)).to.equal(bobOriginalBalance)
        //expect(await ethers.provider.getBalance(this.carol.address)).to.equal(carolOriginalBalance)
        expect(await ethers.provider.getBalance(this.protocolMultisig.address)).to.equal(pOriginalBalance.add('2'))
        expect(await ethers.provider.getBalance(this.royaltyMultisig.address)).to.equal(rOriginalBalance.add('5'))

        // cannot settle again
        await expect(this.sa.connect(this.bob).settle(
            this.nft.address,
            '1'
        )).to.be.revertedWith('SA::settle: nonexistant')
        

        await (await this.sa.grantRole(
            await this.sa.AUCTION_CREATOR_ROLE(),
            this.carol.address
        )).wait()

        await this.nft.connect(this.carol).setApprovalForAll(this.pp.address, true);

        await expect(this.sa.connect(this.carol).create(
            this.carol.address,
            this.nft.address,
            '1',
            '1000',
            '111111111111111111'
        )).to.emit(this.sa, 'AuctionCreated')
        .withArgs(this.carol.address, this.nft.address, '1', '1000', '111111111111111111')
    })

    it("new auctions are paused, then all ongoing cancelled", async function () {
        await (await this.sa.grantRole(
            await this.sa.AUCTION_CREATOR_ROLE(),
            this.alice.address
        )).wait()

        await this.nft.connect(this.alice).setApprovalForAll(this.pp.address, true);

        await expect(this.sa.connect(this.alice).create(
            this.alice.address,
            this.nft.address,
            '1',
            '10',
            '11111111111111111'
        )).to.emit(this.sa, 'AuctionCreated')
        .withArgs(this.alice.address, this.nft.address, '1', '10', '11111111111111111')

        await expect(this.sa.connect(this.alice).create(
            this.alice.address,
            this.nft.address,
            '2',
            '10',
            '11111111111111111'
        )).to.emit(this.sa, 'AuctionCreated')
        .withArgs(this.alice.address, this.nft.address, '2', '10', '11111111111111111')

        await expect(this.sa.connect(this.bob).bid(
            this.nft.address,
            '2',
            '100',
            {value: '100'}
        )).to.emit(this.sa, 'AuctionBid').withArgs(
            this.nft.address,
            '2',
            '100',
            this.bob.address,
            '11111111111111111'
        )
        
        await (await this.sa.connect(this.dev).setAuctionsEnabled(false)).wait()

        await expect(this.sa.connect(this.alice).create(
            this.alice.address,
            this.nft.address,
            '3',
            '10',
            '11111111111111111'
        )).to.be.revertedWith(`SA::createAuction: disabled`);

        // cancels

        await expect(this.sa.connect(this.dev).cancelAuctionAdmin(
            this.nft.address,
            '1'
        )).to.emit(this.sa, 'AuctionCancelled').withArgs(
            this.nft.address,
            '1'
        )

        await expect(this.sa.connect(this.dev).cancelAuctionAdmin(
            this.nft.address,
            '2'
        )).to.emit(this.sa, 'AuctionCancelled').withArgs(
            this.nft.address,
            '2'
        )
    })
})