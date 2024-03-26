import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress } from "../hardhat.config";

task("change-apr", "changes reward rate")
  .addPositionalParam("apr")
  .setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
    if (ldStakingAddress == "") {
      console.log("Set ld token address - npx hardhat vars set STAKING_ADDRESS $address");
      return;
    }
    if (_args.apr < 100) {
      console.log("APR must be added with two extra decimals. eg 50% as 5000, 1% as 100");
    }
    const stakinf = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);
    console.log("setting up new apr");
    const tx = await stakinf.changeApr(_args.apr);
    await tx.wait(2);
    console.log("Changed apr", tx.hash);
  });
