# LD Token Staking Smart Contracts

This repository provides a comprehensive development environment tailored for the LD token staking smart contracts,
leveraging Hardhat and a suite of development tools to facilitate a smooth development, testing, and deployment process.

## Features

- **Hardhat Framework**: Utilizes Hardhat for compiling, deploying, and testing smart contracts in a local Ethereum
  network environment.
- **TypeChain Integration**: Generates TypeScript typings for smart contracts, enabling safer and more predictable code.
- **Ethers.js Library**: Employs Ethers.js for interacting with Ethereum, providing a set of utilities for managing
  wallets, contracts, and transactions.
- **Solidity Linter**: Incorporates Solhint to enforce code quality and conformity to Solidity best practices.
- **Code Coverage**: Implements solidity-coverage to assess test coverage across smart contracts, ensuring thorough
  testing.
- **Prettier Formatting**: Adopts Prettier with Solidity plugin for consistent code formatting, improving readability
  and maintainability.
- **Test Coverage**: Utilize solidity-coverage to measure the coverage of your tests, ensuring comprehensive testing of
  contract functionalities.
- **Contract Sizing**: Includes tools to analyze and report the size of compiled smart contracts, aiding in optimization
  and gas usage estimation.

## Project Structure

Organized for clarity and ease of navigation, the project structure supports efficient development practices:

```plaintext
├── contracts
│   ├── Interface                     # Contains required interfaces
│   │   ├── IRewardPool.sol           # Interface for reward pool contract
│   ├── LDStaking.sol                 # Main contract which handles staking
|   ├── LdToken.sol                   # Mock LD token
|   └── RewardPool.sol                # Contract for reward pool, holds and disburses tokens
├── test                              # Contains tests for contract functionalities
├── deploy                            # Script for deployment of smart contracts
├── tasks                             # Script for interacting with the smart contract
└── hardhat.config.ts                 # Configuration file for Hardhat
```

## Prerequisites

Before diving into development, ensure you have the following tools and configurations set up:

- **Node.js and npm**: Ensure you have Node.js and npm installed to manage project dependencies.
- **Hardhat**: Familiarize yourself with Hardhat's workflow and commands for a smooth development experience.
- **Ethereum Wallet**: Have an Ethereum wallet setup, preferably with testnet Ether for deployment and testing.
- **Solidity Knowledge**: A good understanding of Solidity and smart contract development is essential.

## Usage

### Installation

1. **Clone the Repository**: Start by cloning this repository to your local machine.

```sh
git clone https://github.com/nonceblox/ld-staking-contracts.git
```

2. **Install Dependencies**: Navigate to the project directory and install the necessary dependencies.

```sh
npm install
```

### Setup

Then, you need to set up all the required
[Hardhat Configuration Variables](https://hardhat.org/hardhat-runner/docs/guides/configuration-variables). You might
also want to install some that are optional.

To assist with the setup process, run `npx hardhat vars setup`. To set a particular value, such as a BIP-39 mnemonic
variable, execute this:

```sh
npx hardhat vars set MNEMONIC
? Enter value: ‣ here is where your twelve words mnemonic should be put my friend
```

If you do not already have a mnemonic, you can generate one using this [website](https://iancoleman.io/bip39/).

### Development Workflow

- **Compiling Contracts**: Use Hardhat commands to compile your smart contracts and check for any compilation errors.
- **Running Tests**: Develop and run tests for your smart contracts to ensure reliability and security.
- **Deploying Contracts**: Follow the scripts provided for deploying your contracts to a local testnet or to live
  networks.
- **Interacting with Deployed Contracts**: Use Hardhat or Ethers.js scripts to interact with your deployed contracts and
  test their functionalities.

### Compile

Compile the smart contracts with Hardhat:

```sh
npm run compile
```

```sh
npm run postcompile
```

### TypeChain

Compile the smart contracts and generate TypeChain bindings:

```sh
npm run typechain
```

### Contract Size

Get the contract size

```sh
npm run size
```

### Test

Run the tests with Hardhat:

```sh
npm run test
```

### Lint Solidity

Lint the Solidity code:

```sh
npm run lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
npm run lint:ts
```

### Coverage

Generate the code coverage report:

```sh
npm run coverage
```

### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
REPORT_GAS=true npm run test
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
npm run clean
```

### Tasks

#### Deploy Mock LD Token

Deploy a new instance of the LD token contract via a task on testnet:

```sh
npm run task:deploy-ld
```

#### Deploy LD Staking contract

Deploy a new instance of the LD staking contract via a task on testnet:

```sh
npm run task:deploy-staking
```

#### Deploy Reward Pool

Deploy a new instance of the Reward Pool contract via a task on testnet:

```sh
npm run task:deploy-pool
```

#### Mint mock LD token

Mint 1000000 mock ld token:

```sh
npm run task:mint-ld
```

#### Fund the reward pool

Fund reward pool via task:

```sh
npm run task:fund-pool $amount
```

#### Set address of reward pool in staking contract

set reward pool address in staking contract via task:

```sh
npm run task:set-pool
```

#### Change reward rate

Change the reward rate in staking contract via task:

```sh
npm run task:change-apr $newAPR
/// make sure to add 2 extra decimals eg 50% as 5000
```

#### Change treasury address

Change the treasury address in staking contract via task:

```sh
npm run task:change-treasury $newAddress
```

#### Enable staking

Enable staking via task:

```sh
npm run task:enable-staking
```

#### Disable staking

Disable staking via task:

```sh
npm run task:disable-staking
```

#### Disable reward claims

Disable reward claims in staking contract via task:

```sh
npm run task:disable-claims
```

#### Stake LD tokens

Stake LD tokens via task:

```sh
npm run task:stake $amount
```

### Syntax Highlighting

If you use VSCode, you can get Solidity syntax highlighting with the
[hardhat-solidity](https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity) extension.

## Using GitPod

[GitPod](https://www.gitpod.io/) is an open-source developer platform for remote development.

To view the coverage report generated by `npm run coverage`, just click `Go Live` from the status bar to turn the server
on/off.

## Local development with Ganache

### Install Ganache

```sh
npm i -g ganache
```

### Run a Development Blockchain

```sh
ganache -s test
```

> The `-s test` passes a seed to the local chain and makes it deterministic

Make sure to set the mnemonic in your `.env` file to that of the instance running with Ganache.

## License

This project is licensed under MIT. See the
[LICENSE](https://github.com/nonceblox/ld-staking-contracts/blob/develop/LICENSE.md) file in the repository for more
details.
