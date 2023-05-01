import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';

import { HardhatUserConfig } from 'hardhat/config';

// Specific to the Metamask account
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Specific to the Sepolia network
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/api-key';
const SEPOLIA_CHAIN_ID = process.env.SEPOLIA_CHAIN_ID || '123';

// Specific to Etherscan
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'abcde';

// Specific tp Coinmarketcap
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || 'abcde';

const config: HardhatUserConfig = {
  solidity: '0.8.18',
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
    coinmarketcap: COINMARKETCAP_API_KEY,
  },
};

export default config;
