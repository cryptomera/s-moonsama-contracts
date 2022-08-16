const hre = require("hardhat");
const { ADDRESS_ZERO } = require("../test/utils");

async function main() {
    // We get the contract to deploy
    const Collection = await hre.ethers.getContractFactory("RaresamaCollectionV1");
    const Factory = await hre.ethers.getContractFactory("RaresamaCollectionFactoryV1");
    const TReg = await hre.ethers.getContractFactory("TemplateRegistry");

    const [deployer, dev2] = await hre.ethers.getSigners()

    console.log(deployer.address, dev2.address)
    const chainId = await hre.network.config.chainId;

    console.log(chainId)
    
    const feeAddress = dev2.address
    const mintTestCollection = false

    let erc721TemplateAddress
    if (chainId == '73799') {
    } else {
        erc721TemplateAddress = '0xA291e94Aa68D19518deFC9c5f35da908b8c20032'
    }

    const treg = await TReg.deploy(
        dev2.address,
        dev2.address
    )
    await treg.deployed();
    
    console.log("Template Registry:", `const treg = "${treg.address}"`);

    await (await treg.connect(dev2).setTemplate(hre.ethers.utils.formatBytes32String('ERC721'), erc721TemplateAddress)).wait()

    const factory = await Factory.deploy(
        treg.address,
        dev2.address,
        dev2.address
    )
    await factory.deployed();

    console.log("Collection Factory:", `const factory = "${factory.address}"`);
    
    if (mintTestCollection) {
        console.log('Minting test collection...')
        /*
        await (await factory.connect(dev2).createNonInit(hre.ethers.utils.formatBytes32String('ERC721'))).wait()

        const collA = await factory.getLastCollection()

        const coll = Collection.attach(collA).connect(dev2)

        console.log({
            collA: collA,
            deployer: await coll.deployer(),
            dev2: dev2.address,
            dev1: deployer.address
        })
        */

        
        await (await factory.connect(dev2).create(
            hre.ethers.utils.formatBytes32String('ERC721'),
            dev2.address, //owner - superuser
            dev2.address, //admin
            dev2.address, //minter
            "TestYolococo", //name
            "TY", //symbol
            0, //decimals
            "ipfs://QmPhFz5mKCtndGLLZBwGockGAWz7o7nef4Kgf37gYsTid5", // contract uri
            "ipfs://QmPhFz5mKCtndGLLZBwGockGAWz7o7nef4Kgf37gYsTid5", // default token uri
        )).wait()
        
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
