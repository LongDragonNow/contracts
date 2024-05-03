import { Contract } from "ethers";
import { ethers } from "hardhat";

import { RewardPool__factory } from "../../types";
import { LdStaking__factory } from "../../types/factories/contracts/LdStaking__factory";
import { LdToken__factory } from "../../types/factories/contracts/LdToken__factory";

export async function rewardPoolFixtures() {
  const [owner, addr1, liquidityPoolWallet, reflectionWallet, ecoWallet] = await ethers.getSigners();

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

  const rewardPoolInst = new Contract(rewardPoolAddress, RewardPool__factory.abi, owner);

  return { owner, addr1, rewardPoolInst, ldTokenInst, rewardPoolAddress };
}
