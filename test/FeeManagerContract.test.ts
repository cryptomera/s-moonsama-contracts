import { ethers } from "hardhat";
import { expect } from "chai";
const hre = require("hardhat");

import { ADDRESS_ZERO, deploy } from "./utils";

describe("FeeManagerContract", function () {
  before(async function () {
    this.AUC = await ethers.getContractFactory("ShowdownAuction");
    this.RSC = await ethers.getContractFactory("RaresamaCollectionV1");

    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0];
    this.dev = this.signers[1];
    this.alice = this.signers[2];
    this.bob = this.signers[3];
    this.carol = this.signers[4];
    this.feeMultisig = this.signers[5];
    this.feeCharges = 100;
    this.bidPriceAvg = 100;
    this.paymentReason = hre.ethers.utils.formatBytes32String(
      "BID_AUCTION_REASON",
      ADDRESS_ZERO
    );
    this.token = await (
      await (
        await ethers.getContractFactory("TestERC20")
      ).deploy(this.dev.address)
    ).deployed();
  });

  beforeEach(async function () {
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
    };
    const loadPaymentContract = async () => {
      // We get the contract to deploy
      const PaymentRegistry = await hre.ethers.getContractFactory(
        "PaymentRegistry"
      );
      const PP = await hre.ethers.getContractFactory("PaymentProcessorV1");
      const [deployer, dev2] = await hre.ethers.getSigners();

      const chainId = await hre.network.config.chainId;
      const setFees = true;

      let paymentTokenAddress;
      if (chainId == "73799") {
      } else {
        paymentTokenAddress = "0x6e086cD25f280A048AcD9046EBC83d998AddbE88"; // aPOOP
      }

      const preg = await PaymentRegistry.deploy(dev2.address, dev2.address);
      await preg.deployed();

      await preg
        .connect(dev2)
        .setPaymentToken(this.paymentReason, ADDRESS_ZERO);

      console.log("Payment Registry:", `const preg = "${preg.address}"`);

      if (setFees) {
        console.log("Setting fees...");
        const keccak256 = (x) =>
          hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(x));
        await (
          await preg
            .connect(dev2)
            .setPaymentToken(
              keccak256("PROFILE_VERIFICATION_FEE"),
              paymentTokenAddress
            )
        ).wait();
        await (
          await preg
            .connect(dev2)
            .setPaymentToken(
              keccak256("TOKEN_SUBMISSION_FEE"),
              paymentTokenAddress
            )
        ).wait();
        await (
          await preg
            .connect(dev2)
            .setPaymentToken(
              keccak256("COLLECTION_SUBMISSION_FEE"),
              paymentTokenAddress
            )
        ).wait();
      }

      this.preg = preg;

      // deploy payment processor
      const pp = await PP.deploy();
      await pp.deployed();

      await (await pp.initialize(
        dev2.address,
        dev2.address,
        preg.address
      )).wait()

      console.log("Payment processor:", `const pp = "${pp.address}"`);

      this.pp = pp;
      return { pp, preg };
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
          ADDRESS_ZERO
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

      await (
        await this.devmb.setFee(this.feeMultisig.address, this.feeCharges)
      ).wait();
      await (await this.devmb.mint(this.dev.address, "")).wait();
      // await (await this.collection.setApprovalForAll(this.auc.address,))
    };
    const deployFm = async () => {
      // We get the contract to deploy
      const FeeManager = await hre.ethers.getContractFactory("FeeManager");

      const [deployer, dev2] = await hre.ethers.getSigners();

      console.log(deployer.address, dev2.address);
      const chainId = await hre.network.config.chainId;

      console.log(chainId);

      const feeAddress = dev2.address;
      if (chainId == "73799") {
      } else {
      }

      const fm = await FeeManager.deploy(
        deployer.address,
        dev2.address,
        dev2.address);
      await fm.deployed();
      console.log("FmManager:", fm.address);

      this.fm = fm;
      this.fmAdmin = await this.fm.connect(this.dev);


      return fm;
    };
    await loadPaymentContract();
    await deployCollection();
    await deployPerm();
    await deployFm();
  });

  it("Deployed FeeManager", async function () {
    let feeTo = await this.fmAdmin.getFeeAddress();
    let feeBase = await this.fmAdmin.getFeeBase(
      this.paymentReason,
      this.collection.address,
      100,
      this.bidPriceAvg
    );

    expect(feeTo).to.be.equal(this.dev.address);
    expect(feeBase).to.be.equal(0);

    await (
      await this.fmAdmin.setFeeTo(this.feeMultisig.address)
    ).wait();
    console.log("Setting fee address to :", this.feeMultisig.address);
    await (
      await this.fm
        .connect(this.dev)
        .setBaseFee(this.paymentReason, ethers.BigNumber.from(this.feeCharges))
    ).wait();
    console.log(
      `Setting fee address with ${this.paymentReason} for fee : ${this.feeCharges}`,
      this.paymentReason,
      this.feeCharges
    );
    feeTo = await this.fmAdmin.getFeeAddress();
    feeBase = await this.fmAdmin.getFeeBase(
      this.paymentReason,
      this.collection.address,
      ethers.BigNumber.from(this.feeCharges),
      this.bidPriceAvg
    );

    // expect(feeTo).to.equal(this.feeMultisig.address);
    // expect(feeBase.toString()).to.be.equal(this.feeCharges);
    await (await this.fmAdmin.setBaseFee(this.paymentReason, "700")).wait();
    await (await this.fmAdmin.setBaseFee(this.paymentReason, "700")).wait();
    feeBase = await this.fmAdmin.getFeeBase(
      this.paymentReason,
      this.collection.address,
      "1",
      this.bidPriceAvg
    );
    expect(feeBase).to.be.equal("7");

    await (await this.fmAdmin.setBaseFee(this.paymentReason, "100")).wait();
    feeBase = await this.fmAdmin.getFeeBase(
      this.paymentReason,
      this.collection.address,
      "100",
      "100"
    );
    expect(feeBase).to.be.equal(1);
  });
});
