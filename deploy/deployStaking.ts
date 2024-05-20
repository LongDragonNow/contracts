import { ethers } from "hardhat";

import { ldTokenAddress, owner } from "../hardhat.config";
import { LdStaking__factory } from "../types";

async function main() {
  try {
    if (owner == "") {
      console.log("Set owner's address npx hardhat vars set OWNER_ADDRESS $ownerAddress");
      return;
    }
    if (ldTokenAddress == "") {
      console.log(
        "Error: address for treasurr wallet and ld token not set. Deploy and set addresses using [npx hardhat vars set LD_ADDRESS $tokenAddress] and [npx hardhat vars set TREASURY $treasuryAddress]",
      );
      return;
    }
    const Staking: LdStaking__factory = await ethers.getContractFactory("LdStaking");
    const staking = await Staking.deploy(5000, owner, ldTokenAddress);
    if (!staking || !staking.deploymentTransaction) {
      // If deployTransaction is null, log an error and exit the function early
      console.log(
        "Error: contract factory instance or deployTransaction is null. Contract might not have deployed correctly.",
      );
      return;
    }
    // await staking.deploymentTransaction()!.wait(5);
    // await run("verify:verify", {
    //   address: staking.target,
    //   contract: "contracts/LdStaking.sol:LdStaking", //Filename.sol:ClassName
    //   constructorArguments: [5000, 12, owner, treasuryAddress, ldTokenAddress],
    // });
    console.log(`deployed to ${staking.target}`);
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
