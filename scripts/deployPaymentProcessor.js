const hre = require("hardhat");
const { ADDRESS_ZERO } = require("../test/utils");

async function loadPaymentContract() {
  // We get the contract to deploy
  const PaymentRegistry = await hre.ethers.getContractFactory(
    "PaymentRegistry"
  );
  const PP = await hre.ethers.getContractFactory("PaymentProcessorV1");
  const [deployer, dev2, dev3] = await hre.ethers.getSigners();

  console.log(deployer.address, dev2.address);
  const chainId = await hre.network.config.chainId;

  console.log(chainId);

  const feeAddress = dev2.address;
  const mintTestCollection = true;
  const setFees = true;

  let paymentTokenAddress;
  if (chainId == "73799") {
  } else {
    paymentTokenAddress = "0x6e086cD25f280A048AcD9046EBC83d998AddbE88"; // aPOOP
  }

  const preg = await PaymentRegistry.deploy(dev2.address, dev2.address);
  await preg.deployed();

  console.log("Payment Registry:", `const preg = "${preg.address}"`);

  let paymentReason = hre.ethers.utils.formatBytes32String(
    "BID_AUCTION_REASON",
    ADDRESS_ZERO
  );
  await preg.connect(dev2).setPaymentToken(paymentReason, ADDRESS_ZERO);

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
        .setPaymentToken(keccak256("TOKEN_SUBMISSION_FEE"), paymentTokenAddress)
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

  const pp = await PP.deploy(
    dev2.address,
    dev2.address,
    dev2.address,
    preg.address
  );
  await pp.deployed();

  console.log("Payment processor:", `const pp = "${pp.address}"`);

  return { pp, preg, dev2, deployer, dev3 };
}

loadPaymentContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = { loadPaymentContract };
