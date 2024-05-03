import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress } from "../hardhat.config";

task("disable-staking", "disables staking").setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  if (ldStakingAddress == "") {
    console.log("Set ld token address - npx hardhat vars set STAKING_ADDRESS $address");
    return;
  }

  const stakinf = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);
  if (await stakinf.lock()) {
    console.log("staking is already closed");
    return;
  }
  console.log("disabling staking");
  const tx = await stakinf.disableStaking();
  await tx.wait(2);
  console.log("disabled staking", tx.hash);
});
