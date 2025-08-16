require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.30",
  networks: {
    avalancheFujiTestnet: {
      url: "https://api.avax-test.network/ext/bc/C/rpc", // Fuji RPC
      accounts: [process.env.AVALANCHE_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "snowtrace", // placeholder, required by plugin
    },
    customChains: [
      {
        network: "avalancheFujiTestnet",
        chainId: 43113,
        urls: {
          apiURL:
            "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};
