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

    // const permissionee = '0xe3aff77ccf84ef32e6a06eaa84fa8fb7fcd0c84f' // test multicall
    const permissionee = '0x727cb71ace5b5867feab1a28a3c3fcc74849befe'

    const role = await sa.AUCTION_CREATOR_ROLE()
    //const role = await sa.OPERATOR_ROLE()

    await (await sa.grantRole(
        role,
        permissionee
    )).wait()

    console.log(role, permissionee, await sa.hasRole(role, permissionee))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
