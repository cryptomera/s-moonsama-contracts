const { ethers, network, upgrade } = require("hardhat");
const { ADDRESS_ZERO, ADDRESS_ONE } = require("../test/utils");

async function main() {
    // We get the contract to deploy
    const Collection = await ethers.getContractFactory("RaresamaCollectionV1");
    const Factory = await ethers.getContractFactory("RaresamaCollectionFactoryV1");
    const TReg = await ethers.getContractFactory("TemplateRegistry");

    const FeeManager = await ethers.getContractFactory("FeeManager");
    const PaymentRegistry = await ethers.getContractFactory("PaymentRegistry");
    const PermissionRegistry = await ethers.getContractFactory("PermissionRegistry");
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessorV1");
    const ShowdownAuction = await ethers.getContractFactory("ShowdownAuction");
    const Token = await ethers.getContractFactory("TestERC20")
    const Nft = await ethers.getContractFactory("TestERC721")

    const [deployer, dev2, dev3] = await ethers.getSigners()

    console.log(deployer.address, dev2.address, dev3.address)
    const chainId = await network.config.chainId;

    console.log(chainId)

    const paymentRegistryAddress = '0x9DF912EfE071873a20Aa2899620925a481f15113'
    const permissionRegistryAddress = '0xFEb996a1A145800fCBA841A7F27b061A79353720'
    const feeManagerAddress = '0x4E98c28B486b73b9bE7403CCd322F4DE4a8394cc'
    const paymentProcessorProxyAddress = '0x5Fc7f39CaDcC6d8441444ac6c47f353BA66A9B69'
    const showdownAuctionAddress = '0xCA9f4D0806bD3910a91d1B93F07e7921735F1DE7'

    const preg = await PaymentRegistry.attach(paymentRegistryAddress)
    const pr = await PermissionRegistry.attach(permissionRegistryAddress)
    const fm = await FeeManager.attach(feeManagerAddress)
    const pp = await PaymentProcessor.attach(paymentProcessorProxyAddress)
    const sa = await ShowdownAuction.attach(showdownAuctionAddress)

    const factoryA = '0x6EfEBBb65ea30A0620D221E4519cfab51157dF11'
    const factory = await Factory.attach(factoryA)

    const collection1A = await factory.getCollection("1")
    const collection2A = await factory.getCollection("2")

    const c1 = Collection.attach(collection1A)
    const c2 = Collection.attach(collection2A)

    const owner = '0x495E889d1A6cEB447a57dcc1C68410299392380c'
    const collection = c1

    const sup = (await c1.totalSupply()).toNumber()
    console.log(collection.address)
    for(let i = 0; i< sup; i++) {
        try{
            console.log(i+1, await collection.ownerOf((i+1).toString()))
        } catch {
            console.log(i+1)
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
