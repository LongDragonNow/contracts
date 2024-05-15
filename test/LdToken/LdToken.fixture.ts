import { Contract } from "ethers";
import { ethers } from "hardhat";

import { LdToken__factory } from "../../types/factories/contracts/LdToken__factory";

export async function deployTokenFixture() {
  // Contracts are deployed using the first signer/account by default
  const [owner, addr1, addr2, liquidityPoolWallet, reflectionWallet, ecoWallet] = await ethers.getSigners();

  const LdToken = await ethers.getContractFactory("LdToken");
  const ldtoken = await LdToken.deploy(owner, liquidityPoolWallet, reflectionWallet, ecoWallet);
  const ldTokenAddress = await ldtoken.getAddress();

  const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, owner);

  return { owner, addr1, addr2, ldTokenAddress, ldTokenInst, liquidityPoolWallet, reflectionWallet, ecoWallet };
}
