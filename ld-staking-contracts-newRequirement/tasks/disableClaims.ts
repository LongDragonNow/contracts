import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress } from "../hardhat.config";

task("disable-claims", "disables reward claims").setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  if (ldStakingAddress == "") {
    console.log("Set ld token address - npx hardhat vars set STAKING_ADDRESS $address");
    return;
  }

  const stakinf = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);
  if (await stakinf.claimClosed()) {
    console.log("claims are already closed...");
    return;
  }
  console.log("setting up new treasury");
  const tx = await stakinf.disableRewardClaims();
  await tx.wait(2);
  console.log("Changed treasury", tx.hash);
});
