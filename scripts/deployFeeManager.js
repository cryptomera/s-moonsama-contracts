const hre = require("hardhat");
const { ADDRESS_ZERO } = require("../test/utils");
async function loadFeeManager() {
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

  const fm = await FeeManager.deploy(dev2.address, dev2.address);
  await fm.deployed();
  console.log("FmManager:", fm.address);

  console.log("Fee address to :", feeAddress);
  await (await fm.connect(dev2).setFeeTo(feeAddress)).wait();

  console.log("Set base fee address ", ADDRESS_ZERO);
  console.log("Set base fee amount ", 700);
  await (await fm.connect(dev2).setBaseFee(ADDRESS_ZERO, "700")).wait();

  return fm;
}

loadFeeManager()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = {
  loadFeeManager,
};
