import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldStakingAddress, ldTokenAddress } from "../hardhat.config";

task("stake", "stakes ld")
  .addPositionalParam("amount")
  .setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
    if (ldTokenAddress == "" || ldStakingAddress == "") {
      console.log(
        "reward pool contract or ld token address is not set.. set using npx hardhat vars set LD_ADDRESS || STAKING_ADDRESS",
      );
      return;
    }

    if (_args.amount <= 0) {
      console.log("Amount must be greater than zero");
      return;
    }

    const ld = await hre.ethers.getContractAt("LdToken", ldTokenAddress);
    console.log("getting approvals");
    const tx1 = await ld.approve(ldStakingAddress, _args.amount);
    await tx1.wait(1);
    console.log("approvals done");

    const staking = await hre.ethers.getContractAt("LdStaking", ldStakingAddress);

    if (await staking.lock()) {
      console.log("Staking is not enabled... - use npm run enable-staking");
      return;
    }
    console.log("staking ...");
    const tx2 = await staking.stakeLd(_args.amount);
    await tx2.wait(2);
    console.log("staked", tx2.hash);
  });
