import { Contract } from "ethers";
import { ethers } from "hardhat";

import { LdStaking__factory } from "../../types/factories/contracts/LdStaking__factory";
import { LdToken__factory } from "../../types/factories/contracts/LdToken__factory";
import { RewardPool__factory } from "../../types/factories/contracts/RewardPool__factory";

export async function deployStakingFixture() {
  // Contracts are deployed using the first signer/account by default
  const [owner, addr1, addr2, liquidityPoolWallet, reflectionWallet, ecoWallet, treasury] = await ethers.getSigners();

  const LdToken = await ethers.getContractFactory("LdToken");
  const ldtoken = await LdToken.deploy(owner, liquidityPoolWallet, reflectionWallet, ecoWallet);
  const ldTokenAddress = await ldtoken.getAddress();

  const LdStaking = await ethers.getContractFactory("LdStaking");
  const ldstaking = await LdStaking.deploy(5000, owner, ldTokenAddress);
  const ldStakingAddress = await ldstaking.getAddress();

  const rewardPool = await ethers.getContractFactory("RewardPool");
  const rewpool = await rewardPool.deploy(owner, ldStakingAddress, ldTokenAddress);
  const rewardPoolAddress = await rewpool.getAddress();

  const stakingInst = new Contract(ldStakingAddress, LdStaking__factory.abi, owner);
  await stakingInst.setPool(rewardPoolAddress);

  const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, owner);

  const tx1 = await ldTokenInst.transfer(addr1, ethers.parseEther("2000000"));
  const tx2 = await ldTokenInst.transfer(addr2, ethers.parseEther("2000000"));

  if (!(tx1 && tx2)) {
    console.log("transfer failed");
  }

  const rewardPoolInst = new Contract(rewardPoolAddress, RewardPool__factory.abi, owner);
  await ldTokenInst.approve(rewardPoolAddress, ethers.parseEther("1000000"));
  await rewardPoolInst.fundPool(ethers.parseEther("1000000"));

  return { owner, addr1, addr2, treasury, ldTokenAddress, rewardPoolAddress, ldStakingAddress, stakingInst };
}
