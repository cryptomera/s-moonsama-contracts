const hre = require("hardhat");
const { ADDRESS_ZERO } = require("../test/utils");

async function main() {
    // We get the contract to deploy
    const Collection = await hre.ethers.getContractFactory("RaresamaCollectionV1");
    const Factory = await hre.ethers.getContractFactory("RaresamaCollectionFactoryV1");
    const TReg = await hre.ethers.getContractFactory("TemplateRegistry");

    const [deployer, dev2, dev3] = await hre.ethers.getSigners()

    console.log(deployer.address, dev2.address)
    const chainId = await hre.network.config.chainId;

    console.log(chainId)
    
    const feeAddress = dev2.address
    const mintTestCollection = false

    let factoryA
    if (chainId == '73799') {
    } else {
        factoryA = '0x6EfEBBb65ea30A0620D221E4519cfab51157dF11'
    }

    const factory = await Factory.attach(
        factoryA
    )
    /*
    await (await factory.connect(dev2).create(
        hre.ethers.utils.formatBytes32String('ERC721'),
        dev2.address, //owner - superuser
        dev2.address, //admin
        dev2.address, //minter
        "TestYolococo1", //name
        "TY1", //symbol
        0, //decimals
        "ipfs://QmdCKgexLpBjST3FdWLbPZLH2FWRtu2NXE9dk5ZirdDRGb", // contract uri
        "", // default token uri
    )).wait()

    await (await factory.connect(dev2).create(
        hre.ethers.utils.formatBytes32String('ERC721'),
        dev2.address, //owner - superuser
        dev2.address, //admin
        dev2.address, //minter
        "TestYolococo2", //name
        "TY2", //symbol
        0, //decimals
        "ipfs://QmX4yW2AiMUieGCufkJtvqqVVbgiVBXHoJWywXeEfGs9tm", // contract uri
        "ipfs://QmPrPgxfbzxAoNyHA7hJh6Keg5ExQ5McHDAf5AJ6BmseNr/8.json", // default token uri
    )).wait()
    */
    
    console.log('tokens created')
    const collection1A = await factory.getCollection("1")
    const collection2A = await factory.getCollection("2")

    const c1 = Collection.attach(collection1A)
    const c2 = Collection.attach(collection2A)
        /*
    const uris1 = [
        'ipfs://QmNjTfpaqMSx4XyVCzLP6MeZ4xPYFWcCJy44SFa7Ygv89d',
        'ipfs://Qmbn3uz8puTUu77y9HKU1hLvugRtndsLiT8sjm9HmsLgjn',
        'ipfs://Qmf17abRsH35DzvwkNeX2bBYHAb9RnjQtPjvuB42MEYQp2',
        'ipfs://QmcRtXJAe1jnBzdX2Yfg4w8j7DjwsxFovsVYKGJnTH9oDe',
        'ipfs://QmZ2U6a5PAZNeAvpgghqtRvFPSNwwJRJZizQH2nuwyUVr7',
    ]

    const uris2 = [
        'ipfs://QmbMGZefX1iTCvB9CyVCqnHhsWjLrJPsSBBJ4Yi52jJVQk',
        'ipfs://QmT7RLfU1yEiHeFKXfXro5JD6U9qSSAKLaFCiYhytqSauy',
        'ipfs://QmSMJJsxrfQKvZTWhttMRfDPBhrXDNEJjvKjfkWbQ8zMgX',
        'ipfs://QmSZ9USDvE5cT1hrdwZkmsMFwtkDifhoKvJd4kX3hFPVvc',
        'ipfs://QmUE5JvF3DdiNJ6KYwXhddqQk5pPmuWLsUcvYmnPc4QtHF',
    ]



    for (const uri of uris1) {
        await (await c1.connect(dev2).mint(dev2.address, uri)).wait()
    }

    console.log('collection 1 minted')

    const calldatas = uris2.map(id => c2.interface.encodeFunctionData('mint', [dev2.address, id]))
    await (await c2.connect(dev2)
        .batch(
            calldatas,
            true,
            {gasLimit: '5000000'}
        )).wait()

    console.log('collection 2 minted')
    */

    //await (await c1.connect(dev2).transferFrom(dev2.address, deployer.address, '1')).wait()
    // await (await c1.transferFrom(deployer.address, dev3.address, '1')).wait()

    // await (await c2.connect(dev2).setContractURI('ipfs://Qmc97e79xzzrdNuU3RumGXcK5FYh8PWTb6GyxxHMyRvUYm')).wait()

    // await (await c2.connect(dev2).transferFrom(dev2.address, deployer.address, '1')).wait()
    await (await c2.transferFrom(deployer.address, dev3.address, '1')).wait()

    await (await c1.connect(dev2).burn('2')).wait()
    await (await c1.connect(dev2).burn('3')).wait()

    await (await c2.connect(dev2).burn('2')).wait()
    await (await c2.connect(dev2).burn('3')).wait()

    await (await c1.connect(dev2).setUseCompositeTokenURI('4', true)).wait()
    await (await c1.connect(dev2).setGlobalCompositeTokenURIBase('https://minecraft-metaverse-api.moonsama.com/api/v1/composite/metadata')).wait()
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
