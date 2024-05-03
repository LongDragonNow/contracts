import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldTokenAddress, rewardPoolAddress } from "../hardhat.config";

task("fund-pool", "funds reward pool")
  .addPositionalParam("amount")
  .setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
    if (ldTokenAddress == "" || rewardPoolAddress == "") {
      console.log(
        "reward pool contract or ld token address is not set.. set using npx hardhat vars set LD_ADDRESS || POOL_ADDRESS",
      );
      return;
    }

    if (_args.amount <= 0) {
      console.log("Amount must be greater than zero");
      return;
    }

    const ld = await hre.ethers.getContractAt("LdToken", ldTokenAddress);
    console.log("getting approvals");
    const tx1 = await ld.approve(rewardPoolAddress, _args.amount);
    await tx1.wait(1);
    console.log("approvals done");

    console.log("funding pool...");
    const pool = await hre.ethers.getContractAt("RewardPool", rewardPoolAddress);
    const tx2 = await pool.fundPool(_args.amount);
    await tx2.wait(2);
    console.log("funded reward pool", tx2.hash);
  });
