import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress } from "../hardhat.config";

task("change-treasury", "changes treasury address")
  .addPositionalParam("address")
  .setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
    if (ldStakingAddress == "") {
      console.log("Set ld token address - npx hardhat vars set STAKING_ADDRESS $address");
      return;
    }
    if (!hre.ethers.isAddress(_args.address)) {
      console.log("must be valid address");
    }
    const stakinf = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);
    console.log("setting up new treasury");
    const tx = await stakinf.changeTreasuryAddress(_args.address);
    await tx.wait(2);
    console.log("Changed treasury", tx.hash);
  });
