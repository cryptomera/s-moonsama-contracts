import "dotenv/config";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage"
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter"
import "@openzeppelin/hardhat-upgrades";



// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: any = {
  defaultNetwork: "hardhat",
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "UCSYGQY5MU5UGEYJ6XUYB1BGGGF4I71WJ5"
  },
  gasReporter: {
    currency: 'USD',
    enabled: true
  },
  networks: {
    localhost: {
      gas: 2100000, gasPrice: 8000000000 ,
    },
    hardhat: {
      forking: {
        enabled: process.env.FORKING === "true",
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      },
      gas: 2100000, gasPrice: 8000000000 ,
      chainId: 31337
    },
    volta: {
      url: `https://volta-rpc.energyweb.org`,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2],
      chainId: 73799,
      gasPrice: 1000,
      //gasMultiplier: 2,
      gas: 7900000,
    },
    ewc: {
      url: `https://rpc-ewc.carbonswap.exchange`,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2],
      chainId: 246,
      gasPrice: 1000,
      //gasMultiplier: 2,
      gas: 7900000,
    },
    moonriver: {
      url: `https://rpc.moonriver.moonbeam.network`,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2, process.env.PRIVATE_KEY3],
      chainId: 1285,
      gasPrice: 2500000000,
      gasMultiplier: 2,
    },
    moonbeam: {
      url: `https://rpc.api.moonbeam.network`,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2, process.env.PRIVATE_KEY3],
      chainId: 1284,
      gasPrice: 100000000000,
      gasMultiplier: 2,
    },
    moonbase_dev: {
      url: `https://rpc.api.moonbase.moonbeam.network`,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2, process.env.PRIVATE_KEY3],
      chainId: 1287,
      gasPrice: 100000000000,
      gasMultiplier: 2,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/bf600d22351740e99c8e4ae16f8f072c`,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2],
      chainId: 4,
      gasPrice: 28000000000,
      gasMultiplier: 2,
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        }
      }
    ]
  }
};

export default config;
