import "@nomicfoundation/hardhat-toolbox";
import "@primitivefi/hardhat-dodoc";
import "hardhat-contract-sizer";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import type { NetworkUserConfig } from "hardhat/types";

import "./tasks/index";

// Run 'npx hardhat vars setup' to see the list of variables that need to be set
const polygonScanApiKey: string = vars.get("POLYGONSCAN_API_KEY");
const etherscanApiKey: string = vars.get("ETHERSCAN_API_KEY");
const mnemonic: string = vars.get("MNEMONIC");
const alchemyApiKey: string = vars.get("ALCHEMY_API_KEY");
const coinMarketCapApiKey: string = vars.get("CMC_API_KEY");
const owner: string = vars.get("OWNER_ADDRESS");
const ldTokenAddress: string = vars.has("LD_ADDRESS") ? vars.get("LD_ADDRESS") : "";
const ldStakingAddress: string = vars.has("STAKING_ADDRESS") ? vars.get("STAKING_ADDRESS") : "";
const rewardPoolAddress: string = vars.has("POOL_ADDRESS") ? vars.get("POOL_ADDRESS") : "";
const treasuryAddress: string = vars.has("TREASURY") ? vars.get("TREASURY") : "";

const ecosystemDevelopmentAddress: string = vars.has("ECOSYSTEM_DEVELOPMENT_ADDRESS")
  ? vars.get("ECOSYSTEM_DEVELOPMENT_ADDRESS")
  : "";
const liquidityPoolsAddress: string = vars.has("LIQUIDITY_POOLS_ADDRESS") ? vars.get("LIQUIDITY_POOLS_ADDRESS") : "";
const reflectionsAddress: string = vars.has("REFLECTIONS_ADDRESS") ? vars.get("REFLECTIONS_ADDRESS") : "";

const chainIds = {
  hardhat: 31337,
  ethereum: 1,
  sepolia: 11155111,
  "polygon-mainnet": 137,
  "polygon-mumbai": 80001,
  // add more chain ids
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string;
  switch (chain) {
    case "ethereum":
      jsonRpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
      break;
    case "sepolia":
      jsonRpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;
      break;
    case "polygon-mainnet":
      jsonRpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
      break;
    case `polygon-mumbai`:
      jsonRpcUrl = `https://polygon-mumbai.g.alchemy.com/v2/${alchemyApiKey}`;
      break;
    default:
      jsonRpcUrl = `https://eth-${chain}.alchemyapi.io/v2/${alchemyApiKey}`;
  }
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[chain],
    url: jsonRpcUrl,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: {
      polygon: polygonScanApiKey,
      polygonMumbai: polygonScanApiKey,
      mainnet: etherscanApiKey,
      sepolia: etherscanApiKey,
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: true,
    coinmarketcap: coinMarketCapApiKey,
    excludeContracts: [],
    L1: "ethereum",
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      },
      chainId: chainIds.hardhat,
    },
    ethereum: getChainConfig("ethereum"),
    sepolia: getChainConfig("sepolia"),
    "polygon-mainnet": getChainConfig("polygon-mainnet"),
    "polygon-mumbai": getChainConfig("polygon-mumbai"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.20",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  dodoc: {
    outputDir: process.env.DOC_GEN_LOCAL_PATH,
    runOnCompile: false,
    debugMode: false,
    keepFileStructure: false,
    freshOutput: false,
    include: ["contracts"],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
};

export default config;
export {
  ecosystemDevelopmentAddress,
  ldStakingAddress,
  ldTokenAddress,
  liquidityPoolsAddress,
  owner,
  reflectionsAddress,
  rewardPoolAddress,
  treasuryAddress,
};
