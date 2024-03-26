import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress, rewardPoolAddress } from "../hardhat.config";

task("set-pool", "sets reward pool in staking").setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  if (ldStakingAddress == "") {
    console.log("Set ld token address - npx hardhat vars set STAKING_ADDRESS $address");
    return;
  }

  if (rewardPoolAddress == "") {
    console.log("reward pool not set - npx hardhat vars set POOL_ADDRESS $address");
    return;
  }

  const stakinf = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);
  console.log("setting up pool address");
  const tx = await stakinf.setPool(rewardPoolAddress);
  await tx.wait(2);

  console.log(`pool address set to - ${rewardPoolAddress}`, tx.hash);
});
