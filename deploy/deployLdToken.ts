import { ethers, run } from "hardhat";

import { ecosystemDevelopmentAddress, liquidityPoolsAddress, owner, reflectionsAddress } from "../hardhat.config";
import { LdToken__factory } from "../types";

async function main() {
  try {
    const ldToken: LdToken__factory = await ethers.getContractFactory("LdToken");
    const ldtoken = await ldToken.deploy(owner, liquidityPoolsAddress, reflectionsAddress, ecosystemDevelopmentAddress);
    if (!ldtoken || !ldtoken.deploymentTransaction) {
      // If deployTransaction is null, log an error and exit the function early
      console.log(
        "Error: contract factory instance or deployTransaction is null. Contract might not have deployed correctly.",
      );
      return;
    }
    await ldtoken.deploymentTransaction()!.wait(5);
    await run("verify:verify", {
      address: ldtoken.target,
      contract: "contracts/LdToken.sol:LdToken", //Filename.sol:ClassName
      constructorArguments: [owner, liquidityPoolsAddress, reflectionsAddress, ecosystemDevelopmentAddress],
    });
    console.log(`deployed to ${ldtoken.target}`);
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
