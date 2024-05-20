import { ethers } from "hardhat";

import { ldStakingAddress, ldTokenAddress, owner } from "../hardhat.config";
import { RewardPool__factory } from "../types";

async function main() {
  try {
    if (owner == "") {
      console.log("Set owner's address npx hardhat vars set OWNER_ADDRESS $ownerAddress");
      return;
    }
    if (ldStakingAddress == "" || ldTokenAddress == "") {
      console.log(
        "Error: address for staking contract and ld token not set. Deploy and set addresses using [npx hardhat vars set LD_ADDRESS $tokenAddress] and [npx hardhat vars set STAKING_ADDRESS $stakingAddress]",
      );
      return;
    }
    const rewardPool: RewardPool__factory = await ethers.getContractFactory("RewardPool");
    const rewardpool = await rewardPool.deploy(owner, ldStakingAddress, ldTokenAddress);
    if (!rewardpool || !rewardpool.deploymentTransaction) {
      // If deployTransaction is null, log an error and exit the function early
      console.log(
        "Error: contract factory instance or deployTransaction is null. Contract might not have deployed correctly.",
      );
      return;
    }
    // await rewardpool.deploymentTransaction()!.wait(5);
    // await run("verify:verify", {
    //   address: rewardpool.target,
    //   contract: "contracts/RewardPool.sol:RewardPool", //Filename.sol:ClassName
    //   constructorArguments: [owner, ldStakingAddress, ldTokenAddress],
    // });
    console.log(`deployed to ${rewardpool.target}`);
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log("An unexpected error occurred");
    }
  }
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
