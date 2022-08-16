import { ethers } from "hardhat";
import { expect } from "chai";

import { ADDRESS_ZERO } from "./utils";

describe("RaresamaCollection", function () {
    before(async function () {
        this.RSC = await ethers.getContractFactory("RaresamaCollectionV1");

        this.signers = await ethers.getSigners();
        this.deployer = this.signers[0];
        this.dev = this.signers[1];
        this.alice = this.signers[2];
        this.bob = this.signers[3];
        this.carol = this.signers[4];
        this.feeMultisig = this.signers[5];
    });

    beforeEach(async function () {

        this.mb = await this.RSC.deploy();
        await (await this.mb.initialize(
            this.dev.address,
            this.dev.address,
            this.dev.address,
            "Raresama Curated Collection",
            "RCC",
            0,
            "ipfs://QmWGg5vweosfLjz1BVse44SqZumJZ1yoo65HnNqGuUoFXo",
            "ipfs://QmQgaacC6iKXb7mX9HAwsztuDg22Q9tJXGTZT9nV77Y3pV",
            ADDRESS_ZERO
        )).wait()

        await this.mb.deployed();

        this.devmb = await this.mb.connect(this.dev);
        this.alicemb = await this.mb.connect(this.alice);
        this.bobmb = await this.mb.connect(this.bob);
        this.carolmb = await this.mb.connect(this.carol);

        await (await this.devmb.setFee(
            this.feeMultisig.address,
            "100"
        )).wait()
        
        await (await this.devmb.mint(
            this.alice.address,
            ""
        )).wait()
    });

    it("Init should set the correct init values", async function () {

        const name = await this.mb.name();
        const symbol = await this.mb.symbol();
        const decimals = await this.mb.decimals();
        const ts = await this.mb.totalSupply();

        expect(name).to.equal("Raresama Curated Collection");
        expect(symbol).to.be.equal("RCC");
        expect(decimals).to.equal(0);
        expect(ts).to.equal("1");

        const defaultTokenURI = await this.mb.defaultTokenURI();
        const contractURI = await this.mb.contractURI();

        expect(defaultTokenURI).to.equal("ipfs://QmQgaacC6iKXb7mX9HAwsztuDg22Q9tJXGTZT9nV77Y3pV");
        expect(contractURI).to.equal("ipfs://QmWGg5vweosfLjz1BVse44SqZumJZ1yoo65HnNqGuUoFXo");

        expect(await this.mb.exists(0)).to.equal(false);
        expect(await this.mb.exists(1)).to.equal(true);
    })


    it("should transfer correctly", async function () {
        await expect(this.devmb.mint(
            this.alice.address,
            ""
        )).to.emit(this.mb, "Transfer").withArgs(ADDRESS_ZERO, this.alice.address, '2')


        expect(await this.mb.totalSupply()).to.equal('2')

        await expect(this.alicemb.transferFrom(this.alice.address, this.bob.address, '2')).to.emit(this.mb, "Transfer").withArgs(this.alice.address, this.bob.address, '2')
        
        await expect(this.bobmb.burn('2')).to.emit(this.mb, "Transfer").withArgs(this.bob.address, ADDRESS_ZERO, '2')

        expect(await this.mb.totalSupply()).to.equal('1')
        await expect(this.mb.ownerOf('2')).to.be.reverted

        await expect(this.devmb.mint(
            this.alice.address,
            ""
        )).to.emit(this.mb, "Transfer").withArgs(ADDRESS_ZERO, this.alice.address, '3')
    })

    it("should allow admin change functions", async function () {

        await this.devmb.setDefaultTokenURI('before')

        await this.devmb.mint(
            this.alice.address,
            "badaboom"
        )
    
        await this.devmb.setCustomTokenURI('2', 'ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')
        await this.devmb.setContractURI('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')

        expect(await this.devmb.tokenURI('1')).to.equal('before')
        expect(await this.devmb.tokenURI('2')).to.equal('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')    
        expect(await this.devmb.contractURI()).to.equal('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')

        await this.devmb.setFee(this.carol.address, '300')

        const r = await this.devmb.royaltyInfo('4', '1000')
        expect(r[1]).to.equal('30')
        expect(r[0]).to.equal(this.carol.address)


        await expect(this.mb.setDefaultTokenURI('2')).to.be.revertedWith('RSC::setDTokenURI: unauthorized')
        await expect(this.mb.setContractURI('2')).to.be.revertedWith('RSC::setCURI: unauthorized')
        await expect(this.mb.setCustomTokenURI('2', '2')).to.be.revertedWith('RSC::setCTokenURI: unauthorized')
        await expect(this.mb.setFee(this.carol.address, '2')).to.be.revertedWith('RSC::setFee: unauthorized')
    })

    it("should not allow stuff after lock", async function () {
        await expect(this.devmb.lock()).to.emit(this.mb, "Lock").withArgs('1')

        await expect(this.devmb.setDefaultTokenURI('2')).to.be.revertedWith('RSC::setDTokenURI: locked')
        await expect(this.devmb.setContractURI('2')).to.be.revertedWith('RSC::setContractURI: locked')
        await expect(this.devmb.setCustomTokenURI('2', '2')).to.be.revertedWith('RSC::setCTokenURI: locked')


        const compositeRole = await this.devmb.COMPOSITE_CREATOR_ROLE()
        await this.devmb.grantRole(compositeRole, this.dev.address)
        await expect(this.devmb.setCustomCompositeTokenURIBase('2', '2'))
        await expect(this.devmb.setGlobalCompositeTokenURIBase('2'))

        await expect(this.devmb.lock()).to.be.revertedWith('RSC::lock: already')
        
        this.devmb.setFee(this.carol.address, '2')
    })

    it("gas measurement calls", async function () {
        await this.devmb.mintDefault(this.bob.address)
        await this.devmb.mintDefault(this.carol.address)


        expect(await this.mb.totalSupply()).to.equal('3')
        expect(await this.mb.ownerOf('2')).to.equal(this.bob.address)
        expect(await this.mb.ownerOf('3')).to.equal(this.carol.address)

        await this.devmb.setCustomTokenURI('2', 'ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')

        expect(await this.mb.tokenURI('2')).to.equal('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')
        expect(await this.mb.tokenURI('3')).to.equal('ipfs://QmQgaacC6iKXb7mX9HAwsztuDg22Q9tJXGTZT9nV77Y3pV')
    })

    it("should perform composite changes correctly", async function () {

        await this.devmb.setDefaultTokenURI('default token')

        const compositeRole = await this.devmb.COMPOSITE_CREATOR_ROLE()

        await expect(this.mb.setCustomCompositeTokenURIBase('1', 'composite')).to.be.revertedWith('RSC::setCCTURIB: unauthorized')
        await this.devmb.grantRole(compositeRole, this.dev.address)
        await this.devmb.setCustomCompositeTokenURIBase('1', 'customcomposite')
    
        await this.devmb.setContractURI('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')

        expect(await this.devmb.tokenURI('1')).to.equal('default token')

        // check custom uri set
        await expect(this.devmb.setCustomTokenURI('1', 'ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf'))
        expect(await this.devmb.tokenURI('1')).to.equal('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')

        // flip to composite
        await expect(this.devmb.setUseCompositeTokenURI('1', true)).to.be.revertedWith('RSC::setUseCTURI: unauthorized')
        await this.alicemb.setUseCompositeTokenURI('1', true)
        expect(await this.devmb.tokenURI('1')).to.equal(`customcomposite/31337/${this.devmb.address.toLowerCase()}/1`)

        // custom composite base delete
        await this.devmb.setCustomCompositeTokenURIBase('1', '')
        expect(await this.devmb.tokenURI('1')).to.equal('ipfs://QmUguK1b37LRV4ZTfoDRTpY31ut4dK7hVz1iKteyjygJdf')

        await this.devmb.setCustomTokenURI('1','')
        expect(await this.devmb.tokenURI('1')).to.equal(`default token`)
        expect(await this.devmb.originalURI('1')).to.equal(``)

        await this.devmb.setGlobalCompositeTokenURIBase('https://composite-api.moonsama.com/api/v1')
        expect(await this.devmb.tokenURI('1')).to.equal(`https://composite-api.moonsama.com/api/v1/31337/${this.devmb.address.toLowerCase()}/1`)

        await this.alicemb.setUseCompositeTokenURI('1', false)
        expect(await this.devmb.tokenURI('1')).to.equal(`default token`)
        expect(await this.devmb.compositeURI('1')).to.equal(`https://composite-api.moonsama.com/api/v1/31337/${this.devmb.address.toLowerCase()}/1`)

        await this.alicemb.approve(this.dev.address, '1')
        await this.devmb.setUseCompositeTokenURI('1', false)
    })
})
