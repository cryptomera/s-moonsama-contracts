import { ethers } from "hardhat";
import { expect } from "chai";
const hre = require("hardhat");

import { ADDRESS_ONE, ADDRESS_ZERO, MAX_UINT } from "./utils";

describe("ShowdownAuction", function () {
  before(async function () {
    this.RSC = await ethers.getContractFactory("RaresamaCollectionV1");

    this.AUC = await ethers.getContractFactory("ShowdownAuction");

    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0];
    this.dev = this.signers[1];
    this.alice = this.signers[2];
    this.bob = this.signers[3];
    this.carol = this.signers[4];
    this.feeMultisig = this.signers[5];
    this.feeCharges = "100";
    this.bidPriceAvg = "1";
    this.bidPriceMin = "1";

    this.auctionShowdownThreshold = ethers.BigNumber.from(100);
    this.auctionEndExtension = ethers.BigNumber.from(50);
    this.minBidStepAmount = ethers.BigNumber.from(1);

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

    this.paymentReason = ethers.utils.formatBytes32String(
      "BID_AUCTION_REASON"
      // this.paymentReasonOld = ethers.utils.for(
      //   "BID_AUCTION_REASON",
      // ADDRESS_ZERO
    );
    this.paymentNativeAuction = ethers.utils.formatBytes32String(
      "NATIVE_BID_AUCTION_REASON"
    );
    this.token = await (
      await (
        await ethers.getContractFactory("TestERC20")
      ).deploy(this.dev.address)
    ).deployed();

    // this.tokenNative = await (
    //   await (
    //     await ethers.getContractFactory("IERC20")
    //   ).deploy(ADDRESS_ZERO)
    // ).deployed();
  });

  beforeEach(async function () {
    const loadPaymentContract = async () => {
      // We get the contract to deploy
      const PaymentRegistry = await hre.ethers.getContractFactory(
        "PaymentRegistry"
      );
      const PP = await hre.ethers.getContractFactory("PaymentProcessorV1");
      const chainId = await hre.network.config.chainId;
      const setFees = true;

      let paymentTokenAddress = this.token.address;

      const preg = await PaymentRegistry.deploy(
        this.dev.address,
        this.dev.address
      );
      await preg.deployed();

      await preg
        .connect(this.dev)
        .setPaymentToken(this.paymentReason, this.token.address);

      await preg
        .connect(this.dev)
        .setPaymentToken(this.paymentNativeAuction, ADDRESS_ZERO);
      console.log("Payment Registry:", `const preg = "${preg.address}"`);

      if (setFees) {
        console.log("Setting fees...");
        const keccak256 = (x) =>
          hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(x));
        await (
          await preg
            .connect(this.dev)
            .setPaymentToken(
              keccak256("PROFILE_VERIFICATION_FEE"),
              paymentTokenAddress
            )
        ).wait();
        await (
          await preg
            .connect(this.dev)
            .setPaymentToken(
              keccak256("TOKEN_SUBMISSION_FEE"),
              paymentTokenAddress
            )
        ).wait();
        await (
          await preg
            .connect(this.dev)
            .setPaymentToken(
              keccak256("COLLECTION_SUBMISSION_FEE"),
              paymentTokenAddress
            )
        ).wait();

        // register payment tokens
        await preg
          .connect(this.dev)
          .setPaymentToken(this.paymentTagBid, paymentTokenAddress);
        await preg
          .connect(this.dev)
          .setPaymentToken(this.paymentTagRoyaltyFee, paymentTokenAddress);
        await preg
          .connect(this.dev)
          .setPaymentToken(this.paymentTagProtocolFee, paymentTokenAddress);
        await preg
          .connect(this.dev)
          .setPaymentToken(this.paymentTagMakerFee, paymentTokenAddress);
      }

      this.preg = preg;

      // deploy payment processor
      const pp = await PP.deploy();
      await pp.deployed();

      await (await pp.initialize(
        this.dev.address,
        this.dev.address,
        preg.address
      )).wait()

      console.log("Payment processor:", `const pp = "${pp.address}"`);

      this.pp = pp;
      return { pp, preg };
    };

    const deployFm = async () => {
      // We get the contract to deploy
      const FeeManager = await hre.ethers.getContractFactory("FeeManager");
      const fm = await FeeManager.deploy(
        this.deployer.address,
        this.dev.address,
        this.deployer.address
      );
      await fm.deployed();
      console.log("FmManager:", fm.address);
      this.fm = fm;
      console.log("Setting fee...");
      return fm;
    };
    const deployPerm = async () => {
      const Permission = await hre.ethers.getContractFactory(
        "PermissionRegistry"
      );
      const perm = await Permission.deploy(
        this.dev.address, //_governance
        this.dev.address //_operator
      );
      await perm.deployed();

      this.perm = perm;

      const PaymentRegistry = await hre.ethers.getContractFactory(
        "PaymentRegistry"
      );
      const preg = await PaymentRegistry.deploy(
        this.dev.address,
        this.dev.address
      );
      await preg.deployed();
      await preg
        .connect(this.dev)
        .setPaymentToken(this.paymentReason, this.token.address);
    };
    const deployAuction = async () => {
      await deployPerm();
      await deployFm();

      this.auc = await this.AUC.deploy(
        this.dev.address,
        this.dev.address,
        this.perm.address,
        this.pp.address,
        this.fm.address,
        ethers.BigNumber.from(200),
        ethers.BigNumber.from(60),
        ethers.BigNumber.from(1)
      );

      // We get the contract to deploy
      await this.auc.deployed();

      this.aucAdmin = await this.auc.connect(this.deployer);
      this.aucDev = await this.auc.connect(this.dev);
      this.aucAlice = await this.auc.connect(this.alice);
      this.aucBob = await this.auc.connect(this.bob);
      this.aucCar = await this.auc.connect(this.carol);
    };

    const deployCollection = async () => {
      this.collection = await this.RSC.deploy();

      await (
        await this.collection.initialize(
          this.dev.address,
          this.dev.address,
          this.dev.address,
          "Raresama Curated Collection",
          "RCC",
          0,
          "ipfs://QmWGg5vweosfLjz1BVse44SqZumJZ1yoo65HnNqGuUoFXo",
          "ipfs://QmQgaacC6iKXb7mX9HAwsztuDg22Q9tJXGTZT9nV77Y3pV",
          this.token.address
        )
      ).wait();

      await this.collection.deployed();

      this.devmb = await this.collection.connect(this.dev);
      this.alicemb = await this.collection.connect(this.alice);
      this.bobmb = await this.collection.connect(this.bob);
      this.carolmb = await this.collection.connect(this.carol);

      await (
        await this.devmb.setFee(this.feeMultisig.address, this.feeCharges)
      ).wait();
      await (await this.devmb.mint(this.dev.address, "")).wait();
    };

    await loadPaymentContract();
    await deployAuction();
    await deployCollection();

    // set roles
    await (await this.pp.connect(this.dev).grantRole(
      await this.pp.CASHIER_ROLE(),
      this.auc.address
    )).wait()

    await (await this.auc.connect(this.dev).grantRole(
      await this.auc.AUCTION_CREATOR_ROLE(),
      this.dev.address
    )).wait()

    // set payment tags
    await (await this.auc.connect(this.dev).setPaymentTags(
      this.paymentTagBid,
      this.paymentTagProtocolFee,
      this.paymentTagRoyaltyFee,
      this.paymentTagMakerFee
    )).wait()
  });

  it("Initial auction states", async function () {
    expect(await this.auc.auctionsEnabled()).to.be.equal(false);
    await this.aucDev.setAuctionsEnabled(true);

    expect(await this.auc.auctionsEnabled()).to.be.equal(true);
  });

  it("nft mint", async function () {
    expect(await this.devmb.totalSupply()).to.equal("1");
    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.aucDev.address, true);
    // Open auction
    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let bidP = ethers.BigNumber.from(this.bidPriceMin);
    let endBn = ethers.BigNumber.from(endTime);


    expect(await this.collection.balanceOf(this.dev.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");
    await expect(await this.devmb.ownerOf("1")).to.be.eq(this.dev.address);
  });

  it("allowance create auction", async function () {
    // Open auction
    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    await this.aucDev.setAllowance(
      this.token.address,
      index,
      ethers.utils.formatBytes32String("ERC20"),
      true
    );

    await this.aucDev.setAllowance(
      this.collection.address,
      index,
      ethers.utils.formatBytes32String("ERC721"),
      true
    );
  });

  it("create auction", async function () {
    await expect(await this.devmb.ownerOf("1")).to.be.eq(this.dev.address);
    // Setup
    await (await this.aucDev.setAuctionsEnabled(true)).wait();

    await this.devmb.setApprovalForAll(this.pp.address, true);
    // Open auction
    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let bidP = ethers.BigNumber.from("1");
    let endBn = ethers.BigNumber.from(endTime);
    console.log("endBn", endBn);
    console.log("index", index);
    console.log("bidP", bidP);
    console.log("this.paymentReason", this.paymentReason);

    await this.aucDev.setAllowance(
      this.token.address,
      index,
      ethers.utils.formatBytes32String("ERC20"),
      true
    );

    await this.aucDev.setAllowance(
      this.collection.address,
      index,
      ethers.utils.formatBytes32String("ERC721"),
      true
    );

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      this.bidPriceMin,
      endTime
    );

    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
  });

  it("only admin create auction", async function () {
    expect(await this.devmb.totalSupply()).to.equal("1");
    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);
    // Open auction
    let time = new Date().getTime();
    let endTime = new Date(new Date(time).setFullYear(2023)).getTime();

    // Only admin
    await (await this.devmb.mint(this.alice.address, "")).wait();
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    await expect(
      this.aucAlice.create(
        this.alice.address,
        this.collection.address,
        "1",
        this.bidPriceAvg,
        endTime
      )
    ).to.be.reverted;
  });

  it("Should bid auction", async function () {
    expect(await this.devmb.totalSupply()).to.equal("1");

    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);

    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Payment processor transfer check
    let balanceAlice = await this.token.balanceOf(this.alice.address);
    await (
      await this.aucAlice.bid(this.collection.address, index, bidPrice)
    ).wait();

    let lastBalance =
      ethers.BigNumber.from(balanceAlice).toNumber() - bidPrice.toNumber();

    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    expect(await this.token.balanceOf(this.pp.address)).to.equal(bidPrice);
    expect(await this.token.balanceOf(this.alice.address)).to.equal(
      lastBalance
    );
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
  });

  it("Should rebid auction", async function () {
    expect(await this.devmb.totalSupply()).to.equal("1");
    // SETUP
    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);

    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    // Create auction
    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Bid 
    let balanceAlice = await this.token.balanceOf(this.alice.address);
    await (
      await this.aucAlice.bid(this.collection.address, index, bidPrice)
    ).wait();
    //  Payment processor transfer check
    let lastBalance =
      ethers.BigNumber.from(balanceAlice).toNumber() - bidPrice.toNumber();
    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    expect(await this.token.balanceOf(this.pp.address)).to.equal(bidPrice);
    expect(await this.token.balanceOf(this.alice.address)).to.equal(
      lastBalance
    );
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    // rebid
    let comp = bidPrice.add(this.minBidStepAmount);
    await (await this.token.connect(this.dev).mint(comp, this.bob.address)).wait()
    await (await this.token.connect(this.bob).approve(this.pp.address, MAX_UINT)).wait()
    let balanceBob = await this.token.balanceOf(this.bob.address);
    let lastBobBalance =
      ethers.BigNumber.from(balanceBob).toNumber() - comp.toNumber();

    await (
      await this.auc.connect(this.bob).bid(this.collection.address, index, comp)
    ).wait();


    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    expect(await this.token.balanceOf(this.pp.address)).to.equal(comp);
    expect(await this.token.balanceOf(this.bob.address)).to.equal(
      lastBobBalance
    );
    expect(await this.token.balanceOf(this.alice.address)).to.equal(
      balanceAlice
    );
  });

  it("Should CANCEL auction only for OPERATOR_ROLE", async function () {
    expect(await this.devmb.totalSupply()).to.equal("1");
    await (await this.aucDev.setAuctionsEnabled(true)).wait();

    await this.devmb.setApprovalForAll(this.pp.address, true);

    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Payment processor transfer check
    let balanceAlice = await this.token.balanceOf(this.alice.address);

    await (
      await this.aucAlice.bid(this.collection.address, index, bidPrice)
    ).wait();

    expect(await this.token.balanceOf(this.pp.address)).to.equal(bidPrice);

    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    console.log("auction", auction);

    let endTimeAuction = await auction.end;
    endTimeAuction = ethers.BigNumber.from(endTimeAuction).toNumber();
    console.log("endTimeAuction", endTimeAuction);

    // await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 * 60 * 60]);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimeAuction]);
    await (
      await this.aucDev.cancelAuctionAdmin(this.collection.address, index)
    ).wait();

    // check if the BIDER get the token BACK
    expect(await this.token.balanceOf(this.alice.address)).to.gte(bidPrice);
    expect(await this.token.balanceOf(this.alice.address)).to.eq(balanceAlice);
    expect(await this.token.balanceOf(this.auc.address)).to.equal("0");
    // check if the MAKER get the NFT back
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.dev.address)).to.equal("1");

    await expect(
      this.aucAlice.cancelAuctionAdmin(this.collection.address, index)
    ).to.be.reverted;
  });

  it("Should settle auction", async function () {
    expect(await this.devmb.totalSupply()).to.equal("1");
    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);

    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Payment processor transfer check
    let balanceAlice = await this.token.balanceOf(this.alice.address);

    await (
      await this.aucAlice.bid(this.collection.address, index, bidPrice)
    ).wait();

    expect(await this.token.balanceOf(this.pp.address)).to.equal(bidPrice);

    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    console.log("auction", auction);

    let endTimeAuction = await auction.end;
    endTimeAuction = ethers.BigNumber.from(endTimeAuction).toNumber();
    console.log("endTimeAuction", endTimeAuction);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimeAuction]);
    await (await this.aucDev.settle(this.collection.address, index)).wait();
    // check if Alice have the nft and Dev the tokens
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");

    expect(await this.token.balanceOf(this.dev.address)).to.equal(bidPrice);
    expect(await this.token.balanceOf(this.auc.address)).to.equal("0");

    let lastBalance =
      ethers.BigNumber.from(balanceAlice).toNumber() - bidPrice.toNumber();
    //  check if contract have the amount of token and the nft
    expect(await this.token.balanceOf(this.alice.address)).to.equal(
      lastBalance
    );
    expect(await this.token.balanceOf(this.alice.address)).to.lte(balanceAlice);
  });

  it("settle auction with fees", async function () {
    await (
      await this.fm.connect(this.dev).setFeeTo(this.deployer.address)
    ).wait();
    console.log("Setting fee address to :", this.deployer.address);

    await (
      await this.fm
        .connect(this.dev)
        .setBaseFee(this.paymentTagProtocolFee, ethers.BigNumber.from(this.feeCharges))
    ).wait();
    console.log(
      `Setting fee address with ${this.paymentTagProtocolFee} for fee : ${this.feeCharges}`,
      this.paymentTagProtocolFee,
      this.feeCharges
    );

    expect(await this.devmb.totalSupply()).to.equal("1");

    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);

    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Payment processor transfer check
    let balanceAlice = await this.token.balanceOf(this.alice.address);

    await (
      await this.aucAlice.bid(this.collection.address, index, bidPrice)
    ).wait();

    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    console.log("auction", auction);
    let endTimeAuction = await auction.end;
    endTimeAuction = ethers.BigNumber.from(endTimeAuction).toNumber();
    console.log("endTimeAuction", endTimeAuction);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimeAuction]);
    await (await this.aucDev.settle(this.collection.address, index)).wait();
    // check if Alice have the nft and Dev the tokens
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");

    expect(await this.token.balanceOf(this.dev.address)).to.gte(bidPrice);
    expect(await this.token.balanceOf(this.auc.address)).to.equal("0");

    let lastBalance =
      ethers.BigNumber.from(balanceAlice).toNumber() - bidPrice.toNumber();
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");

    expect(await this.token.balanceOf(this.dev.address)).to.gt(bidPrice);
    expect(await this.token.balanceOf(this.auc.address)).to.equal("0");

    //  check if contract have the amount of token and the nft
    expect(await this.token.balanceOf(this.auc.address)).to.equal(0);
    expect(await this.token.balanceOf(this.alice.address)).to.equal(
      lastBalance
    );
  });

  it("NATIVE : settle auction", async function () {

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

    await (
      await this.fm.connect(this.dev).setFeeTo(this.deployer.address)
    ).wait();
    console.log("Setting fee address to :", this.deployer.address);
    // SETUP
    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);

    // Create auction
    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    // Payment processor transfer check
    await (
      await this.aucAlice.bid(
        this.collection.address,
        index,
        ethers.utils.parseEther("2"),
        { value: ethers.utils.parseEther("2") }
      )
    ).wait();
    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    console.log("auction", auction);
    let endTimeAuction = await auction.end;
    endTimeAuction = ethers.BigNumber.from(endTimeAuction).toNumber();
    // console.log("endTimeAuction", endTimeAuction);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimeAuction]);
    await (await this.aucDev.settle(this.collection.address, index)).wait();
    // check if Alice have the nft and Dev the tokens
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");
    expect(await ethers.provider.getBalance(this.dev.address)).to.gte(bidPrice);
    expect(await ethers.provider.getBalance(this.auc.address)).to.equal("0");
    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");
    expect(await ethers.provider.getBalance(this.dev.address)).to.gt(bidPrice);
    expect(await ethers.provider.getBalance(this.auc.address)).to.equal("0");
    expect(await ethers.provider.getBalance(this.auc.address)).to.equal(0);
  });

  it("NATIVE : settle auction with fees", async function () {

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


    await (
      await this.fm.connect(this.dev).setFeeTo(this.deployer.address)
    ).wait();
    await (
      await this.fm
        .connect(this.dev)
        .setBaseFee(this.paymentTagProtocolFee, ethers.BigNumber.from(this.feeCharges))
    ).wait();
    console.log(
      `Setting fee address with ${this.paymentTagProtocolFee} for fee : ${this.feeCharges}`,
      this.paymentTagProtocolFee,
      this.feeCharges
    );
    expect(await this.devmb.totalSupply()).to.equal("1");
    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);
    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Payment processor transfer check
    let balanceAlice = await ethers.provider.getBalance(this.alice.address);
    console.log("balanceAliceNative", balanceAlice.toString());
    await (
      await this.aucAlice.bid(
        this.collection.address,
        index,
        ethers.utils.parseEther("2"),
        { value: ethers.utils.parseEther("2") }
      )
    ).wait();
    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    let balancePP = await ethers.provider.getBalance(this.pp.address);
    expect(balancePP.toString()).to.equal(
      ethers.utils.parseEther(bidPrice.toString()).toString()
    );
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    console.log("auction", auction);
    let endTimeAuction = await auction.end;
    endTimeAuction = ethers.BigNumber.from(endTimeAuction).toNumber();
    // console.log("endTimeAuction", endTimeAuction);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimeAuction]);
    await (await this.aucDev.settle(this.collection.address, index)).wait();
    // check if Alice have the nft and Dev the tokens
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");
    expect(await ethers.provider.getBalance(this.dev.address)).to.gte(bidPrice);
    expect(await ethers.provider.getBalance(this.auc.address)).to.equal("0");
    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");
    expect(await ethers.provider.getBalance(this.dev.address)).to.gt(bidPrice);
    expect(await ethers.provider.getBalance(this.auc.address)).to.equal("0");
  });

  it("NATIVE : settle native auction with fees and MULTI BID", async function () {

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


    await (
      await this.fm.connect(this.dev).setFeeTo(this.deployer.address)
    ).wait();
    console.log("Setting fee address to :", this.deployer.address);

    await (
      await this.fm
        .connect(this.dev)
        .setBaseFee(this.paymentTagProtocolFee, ethers.BigNumber.from(this.feeCharges))
    ).wait();
    console.log(
      `Setting fee address with ${ADDRESS_ZERO} for fee : ${this.feeCharges}`,
      ADDRESS_ZERO,
      this.feeCharges
    );

    expect(await this.devmb.totalSupply()).to.equal("1");

    await (await this.aucDev.setAuctionsEnabled(true)).wait();
    await this.devmb.setApprovalForAll(this.pp.address, true);

    let time = new Date().getTime();
    let endTime = time + 1000 * 60 * 24;
    let index = ethers.BigNumber.from("1");
    let auctionPrice = ethers.BigNumber.from("1");
    let bidPrice = ethers.BigNumber.from("1").add(
      ethers.BigNumber.from(this.minBidStepAmount)
    );
    let endBn = ethers.BigNumber.from(endTime);
    await this.token.connect(this.dev).mint(bidPrice, this.alice.address);
    await this.token.connect(this.alice).approve(this.pp.address, MAX_UINT);

    await this.aucDev.create(
      this.dev.address,
      this.collection.address,
      index,
      auctionPrice,
      endBn
    );

    expect(await this.collection.balanceOf(this.dev.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");

    // Payment processor transfer check
    let balanceAlice = await ethers.provider.getBalance(this.alice.address);
    await (
      await this.aucAlice.bid(
        this.collection.address,
        index,
        ethers.utils.parseEther("2"),
        { value: ethers.utils.parseEther("2") }
      )
    ).wait();

    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    // REBID
    let comp = bidPrice.add(this.minBidStepAmount);
    await this.token.connect(this.dev).mint(comp, this.bob.address);
    let balanceBob = await ethers.provider.getBalance(this.bob.address);
    await (
      await this.auc
        .connect(this.bob)
        .bid(this.collection.address, index, ethers.utils.parseEther("3"), {
          value: ethers.utils.parseEther("3"),
        })
    ).wait();

    //  check if contract have the amount of token and the nft
    expect(await this.collection.balanceOf(this.pp.address)).to.equal("1");
    let balancePP = await ethers.provider.getBalance(this.pp.address);
    expect(balancePP.toString()).to.equal(
      ethers.utils.parseEther(comp.toString())
    );
    // Settle auction
    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    console.log("auction", auction);
    let endTimeAuction = await auction.end;
    endTimeAuction = ethers.BigNumber.from(endTimeAuction).toNumber();
    console.log("endTimeAuction", endTimeAuction);
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTimeAuction]);
    await (await this.aucDev.settle(this.collection.address, index)).wait();

    // check if Alice have the nft and Dev the tokens
    expect(await this.collection.balanceOf(this.alice.address)).to.equal("0");
    expect(await this.collection.balanceOf(this.bob.address)).to.equal("1");
    expect(await this.collection.balanceOf(this.auc.address)).to.equal("0");

    //  check if contract have the amount of token and the nft
    expect(await ethers.provider.getBalance(this.dev.address)).to.gte(bidPrice);
    expect(await ethers.provider.getBalance(this.alice.address)).to.lte(
      balanceAlice
    );
    expect(await ethers.provider.getBalance(this.bob.address)).to.lte(
      balanceBob
    );
    expect(await ethers.provider.getBalance(this.auc.address)).to.equal(0);
  });
});
