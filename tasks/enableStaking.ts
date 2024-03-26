import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress } from "../hardhat.config";

task("enable-staking", "enables staking").setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  if (ldStakingAddress == "") {
    console.log("Set ld token address - npx hardhat vars set STAKING_ADDRESS $address");
    return;
  }
  const stakinf = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);
  if (!(await stakinf.lock())) {
    console.log("staking is already enabled");
    return;
  }
  if ((await stakinf._rewardPool()) == "0x0000000000000000000000000000000000000000") {
    console.log("set reward pool in staking contract before enabling staking - use command npm run set-pool");
    return;
  }
  console.log("enabling staking");
  const tx = await stakinf.enableStaking();
  await tx.wait(2);
  console.log("enabled staking", tx.hash);
});
