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
    

    let erc721Address
    if (chainId == '73799') {
    } else {
        erc721Address = '0xe4edcaaea73684b310fc206405ee80abcec73ee0'
    }

    const tokenIds = Array.from({length: 10}, (v, i) => (i+1).toString())

    const coll = await Collection.attach(
        erc721Address
    )
    
    const contracturi = await coll.contractURI()
    const duri = await coll.defaultTokenURI()

    console.log('Contract:', erc721Address)
    console.log('Contract URI:', contracturi)
    console.log('Default URI:', duri)
    for(tokenId of tokenIds) {
        const turi = await coll.tokenURI(tokenId)
        const ouri = await coll.originalURI(tokenId)
        const curi = await coll.compositeURI(tokenId)

        console.log('')
        console.log(`--- ID ${tokenId} ---`)
        console.log('Token URI:', turi)
        console.log('Original URI:', ouri)
        console.log('Composite URI:', curi)
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
