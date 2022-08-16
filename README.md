# nft
Raresama contracts repo

Whoever has access to this repo is under NDA. If you leak, god help you.

## Install
```
yarn
```

## How to use
1. manually change the variables in the scrips to fiddle with contracts, deploy, etc.
2. `yarn hardhat run --network movr scripts/deploy.js`

# Overview of Showdown Auction


## Integrate to frontend

### Get the auction payment token 
```jsx
    // Get the auction with address and index
    const auction = await this.aucDev.ongoingAuction(
      this.collection.address,
      index
    );
    let paymentTag = await auction.paymentTag; // Get the tag to keep the value
    let paymentToken = paymentProcessor.getPaymentToken(paymentTag) // get an address
    if(paymentToken == ADDRESS_ZERO) {
        //  Bid with native coin
    } else if ( paymentToken == token.address ) {
        //  Bid with ERC20 Token
    }
```

### Bid with NATIVE token
```jsx
    // Payment processor transfer check
    await (
      await showdownContract.bid(
        collection.address, // Raresama address
        index, // Address to bid 
        ethers.utils.parseEther("2"), // Parse it for native token 
        { value: ethers.utils.parseEther("2") } // Value need to be send
      )
    ).wait();
```

### Bid with token ERC20
```jsx

    await tokenPoap.connect(this.user).approve(paymentProcessor.address, ethers.constants.MaxUint256);
        await token
      .connect(this.user)
      .increaseAllowance(showdownContract.address, ethers.constants.MaxUint256);

    // Payment processor transfer check
    await (
      await showdownContract.bid(
        collection.address, // Raresama address
        index, // Index to bid = BigNumber
        bidPrice, // Big Number required to be :  auction.price  + showdownContract.minBidStepAmount
      )
    ).wait();
```

### Settle when auction is finished
```jsx

    // Set allowance need to be called with the OPERATOR_ROLE
    await showdownContract.setAllowance(
      this.token.address,
      index,
      ethers.utils.formatBytes32String("ERC20"),
      true
    );

    await showdownContract.setAllowance(
      this.collection.address,
      index,
      ethers.utils.formatBytes32String("ERC721"),
      true
    );


    await showdownContract.settle(this.collection.address, index));
```


## Admin 

### Create auction : Required the signer is the_auctionCreator address 
```jsx
    // Need admin connection
    await collection.setApprovalForAll(paymentProcessor.address, true);
    await showdownContract.setAuctionsEnabled(true);
    
    // Set allowance need to be called with the OPERATOR_ROLE
    await showdownContract.setAllowance(
      this.token.address,
      index,
      ethers.utils.formatBytes32String("ERC20"),
      true
    );

    await showdownContract.setAllowance(
      this.collection.address,
      index,
      ethers.utils.formatBytes32String("ERC721"),
      true
    );

    // For POAP Token
    const paymentReason = ethers.utils.formatBytes32String(
      "BID_AUCTION_REASON"
    );
    // For GLMR auction
    const paymentNativeAuction = ethers.utils.formatBytes32String(
      "NATIVE_BID_AUCTION_REASON"
    );
    // The signer need to be the _auctionCreator address setup 
    await showdownContract.createAuction(
      collection.address,
      index,
      bidPriceMin,
      endTime,
      paymentReason // For POAP token, for native use paymentNativeAuction
    );
```
