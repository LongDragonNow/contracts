import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ldTokenAddress } from "../hardhat.config";

task("mint-ld", "Mint tokens").setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
  if (ldTokenAddress == "") {
    console.log("Set ld token address - npx hardhat vars set LD_ADDRESS $address");
    return;
  }
  const ld = await hre.ethers.getContractAt("LdToken", ldTokenAddress);
  console.log("minting tokens");
  const tx = await ld.mint();
  await tx.wait(2);
  console.log("minted tokens", tx.hash);
});
