import { Addressable } from "ethers";
import { ethers } from "hardhat";

import { ecosystemDevelopmentAddress, liquidityPoolsAddress, owner, reflectionsAddress } from "../hardhat.config";
import { LdStaking__factory, LdToken__factory, RewardPool__factory } from "../types";

async function deployLdToken() {
  const ldTokenFactory: LdToken__factory = await ethers.getContractFactory("LdToken");
  console.log("Deploying LdToken...");
  const ldToken = await ldTokenFactory.deploy(
    owner,
    liquidityPoolsAddress,
    reflectionsAddress,
    ecosystemDevelopmentAddress,
  );

  if (!ldToken || !ldToken.deploymentTransaction) {
    // If deployTransaction is null, log an error and exit the function early
    console.log(
      "Error: contract factory instance or deployTransaction is null. Contract might not have deployed correctly.",
    );
    return;
  }

  console.log(`LdToken deployed to: ${ldToken.target}`);

  return ldToken;
}

async function deployLdStaking(ldTokenAddress: string | Addressable) {
  const stakingFactory: LdStaking__factory = await ethers.getContractFactory("LdStaking");
  console.log("Deploying LdStaking...");
  const staking = await stakingFactory.deploy(5000, owner, ldTokenAddress);

  if (!staking || !staking.deploymentTransaction) {
    // If deployTransaction is null, log an error and exit the function early
    console.log(
      "Error: contract factory instance or deployTransaction is null. Contract might not have deployed correctly.",
    );
    return;
  }

  console.log(`LdStaking deployed to: ${staking.target}`);

  return staking;
}

async function deployRewardPool(ldStakingAddress: string | Addressable, ldTokenAddress: string | Addressable) {
  const rewardPoolFactory: RewardPool__factory = await ethers.getContractFactory("RewardPool");
  console.log("Deploying RewardPool...");
  const rewardPool = await rewardPoolFactory.deploy(owner, ldStakingAddress, ldTokenAddress);

  if (!rewardPool || !rewardPool.deploymentTransaction) {
    // If deployTransaction is null, log an error and exit the function early
    console.log(
      "Error: contract factory instance or deployTransaction is null. Contract might not have deployed correctly.",
    );
    return;
  }

  console.log(`RewardPool deployed to: ${rewardPool.target}`);

  return rewardPool;
}

async function main() {
  try {
    if (!owner) {
      console.log("Set owner's address using npx hardhat vars set OWNER_ADDRESS $ownerAddress");
      return;
    }
    if (!liquidityPoolsAddress || !reflectionsAddress || !ecosystemDevelopmentAddress) {
      console.log("Error: address for liquidityPools, reflections or ecosystemDevelopment not set.");
      return;
    }

    // Print all addresses
    console.log("Owner address:", owner);
    console.log("Liquidity Pools address:", liquidityPoolsAddress);
    console.log("Reflections address:", reflectionsAddress);

    console.log("-----------------------------------");

    const ldToken = await deployLdToken();

    if (!ldToken) {
      console.log("Error: LdToken contract not deployed.");
      return;
    }

    const ldStaking = await deployLdStaking(ldToken.target);

    if (!ldStaking) {
      console.log("Error: LdStaking contract not deployed.");
      return;
    }

    const rewardPool = await deployRewardPool(ldStaking.target, ldToken.target);

    if (!rewardPool) {
      console.log("Error: RewardPool contract not deployed.");
      return;
    }

    console.log("-----------------------------------");

    // Print all addresses
    console.log("LdToken address:", ldToken.target);
    console.log("LdStaking address:", ldStaking.target);
    console.log("RewardPool address:", rewardPool.target);

    console.log("-----------------------------------");

    console.log("All contracts deployed successfully!");

    const tx = await ldToken.setIsExcludedFromMaxWalletToken(rewardPool.target, true);
    await tx.wait();

    if (tx && tx.hash) {
      console.log(`Excluded ${rewardPool.target} from max wallet token`);
    } else {
      console.log("Error: Failed to exclude from max wallet token");
    }

    const tx2 = await ldToken.setTaxExemption(rewardPool.target, true);
    await tx2.wait();

    if (tx2 && tx2.hash) {
      console.log(`Excluded ${rewardPool.target} from tax`);
    } else {
      console.log("Error: Failed to exclude from tax");
    }

    console.log("All contracts deployed and configured successfully!");

    // Print all addresses
    console.log("-----------------------------------");
    console.log("Owner address:", owner);
    console.log("Liquidity Pools address:", liquidityPoolsAddress);
    console.log("Reflections address:", reflectionsAddress);

    console.log("LdToken address:", ldToken.target);
    console.log("LdStaking address:", ldStaking.target);
    console.log("RewardPool address:", rewardPool.target);
    console.log("-----------------------------------");
  } catch (error) {
    console.error("An error occurred during deployment:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("Unexpected error", error);
    }
  }
}

main().catch((error) => {
  console.error("An unexpected error occurred in the main function:");
  console.error(error);
  process.exitCode = 1;
});
