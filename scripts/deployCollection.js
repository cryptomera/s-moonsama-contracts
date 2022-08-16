const hre = require("hardhat");
const { ADDRESS_ZERO } = require("../test/utils");

async function main() {
    // We get the contract to deploy
    const MS = await hre.ethers.getContractFactory("RaresamaCollectionV1");

    const [deployer, dev2] = await hre.ethers.getSigners()

    console.log(deployer.address, dev2.address)
    const chainId = await hre.network.config.chainId;

    console.log(chainId)
    
    const feeAddress = dev2.address
    if (chainId == '73799') {
    } else {
    }

    const ms = await MS.deploy()
    await ms.deployed();


    console.log("TestCollection:", ms.address);


    console.log("initializing...");
    
    await (await ms.initialize(
        dev2.address, //owner - superuser
        dev2.address, //admin
        dev2.address, //minter
        "TestYolococo", //name
        "TY", //symbol
        0, //decimals
        "ipfs://QmPhFz5mKCtndGLLZBwGockGAWz7o7nef4Kgf37gYsTid5", // contract uri
        "ipfs://QmPhFz5mKCtndGLLZBwGockGAWz7o7nef4Kgf37gYsTid5", // default token uri
        ADDRESS_ZERO // opensea compatible registry address (irrelevant)
    )).wait()
    
    
    console.log("Setting fee...");
    await (await ms.connect(dev2).setFee(
        feeAddress,
        "700"
    )).wait()
    
    console.log("contract URI:", await ms.contractURI());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
