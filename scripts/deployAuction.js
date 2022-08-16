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

    console.log(deployer.address, dev2.address)
    const chainId = await network.config.chainId;

    console.log(chainId)

    const paymentTagBid = ethers.utils.formatBytes32String(
        "SA_V1_BID"
    );
    const paymentTagRoyaltyFee = ethers.utils.formatBytes32String(
        "SA_V1_ROYALTY"
    );
    const paymentTagProtocolFee = ethers.utils.formatBytes32String(
        "SA_V1_PROTOCOL"
    );
    const paymentTagMakerFee = ethers.utils.formatBytes32String(
        "SA_V1_MAKER"
    );

    const protocolFeeAddress = dev2.address
    const protocolFeeAmount = '200'

    const auctionShowdownThreshold = '3600' // 1 hour
    const auctionShowdownExtension = '3600' // 1 hour
    const minBidStepAmount = '1000' // wei

    // deploy Payment Registry
    console.log('Deploy payment registry')
    const preg = await PaymentRegistry.deploy(
        deployer.address,
        dev2.address
    );
    await preg.deployed();

    let calldatas = [
        paymentTagBid,
        paymentTagRoyaltyFee,
        paymentTagProtocolFee,
        paymentTagMakerFee
    ].map(tag => preg.interface.encodeFunctionData('setPaymentToken', [tag, ADDRESS_ONE]))
    console.log('setting tags')
    await (
        await preg.connect(dev2).batch(
            calldatas,
            true
        )
    ).wait()

    // deploy payment processor
    console.log('deploy payment processor')
    const pp = await upgrades.deployProxy(PaymentProcessor, [dev2.address, dev2.address, preg.address], {
        initializer: "initialize",
        kind: 'uups'
    });
    await pp.deployed()

    // deploy fee manager & config
    console.log('deploy fm')
    const fm = await FeeManager.deploy(
        deployer.address,
        dev2.address,
        dev2.address
    )
    await fm.deployed()
    console.log('set base fee')
    await (await fm.connect(dev2).setBaseFee(paymentTagProtocolFee, '200')).wait()

    // deploy permission registry
    console.log('deploy permission registry')
    const pr = await PermissionRegistry.deploy(
        dev2.address,
        dev2.address
    )
    await pr.deployed()

    
    // deploy showdown auction
    console.log('deploy showdown auction')
    const sa = await ShowdownAuction.deploy(
        dev2.address,
        dev2.address,
        pr.address,
        pp.address,
        fm.address,
        auctionShowdownThreshold,
        auctionShowdownExtension,
        minBidStepAmount
    );
    await sa.deployed();

    calldatas = [
        sa.interface.encodeFunctionData('setAuctionsEnabled', [true]),
        sa.interface.encodeFunctionData('setPaymentTags', [
            paymentTagBid,
            paymentTagProtocolFee,
            paymentTagRoyaltyFee,
            paymentTagMakerFee
        ])
    ]

    // permission sa in pp
    console.log('set auctions and tags')
    await (
        await sa.connect(dev2).batch(
            calldatas,
            true
        )
    ).wait()

    // permission sa in pp
    console.log('grant cashier role to sa')
    await (await pp.connect(dev2).grantRole(
        await pp.CASHIER_ROLE(),
        sa.address
    )).wait()

    console.log(`const paymentRegistryAddress = '${preg.address}'`);
    console.log(`const permissionRegistryAddress = '${pr.address}'`);
    console.log(`const feeManagerAddress = '${fm.address}'`);
    console.log(`const paymentProcessorProxyAddress = '${pp.address}'`);
    console.log(`const showdownAuctionAddress = '${sa.address}'`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
