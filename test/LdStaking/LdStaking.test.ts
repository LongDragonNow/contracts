import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

import { LdToken__factory } from "../../types";
import { LdStaking__factory } from "../../types/factories/contracts/LdStaking__factory";
import type { Signers } from "../types";
import { deployStakingFixture } from "./LdStaking.fixture";

describe("LdStaking", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.admin = signers[0];

    this.loadFixture = loadFixture;
  });

  describe("Deployment", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldStakingAddress, ldTokenAddress, rewardPoolAddress, treasury, stakingInst } =
        await this.loadFixture(deployStakingFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldStakingAddress = ldStakingAddress;
      this.ldTokenAddress = ldTokenAddress;
      this.rewardPoolAddress = rewardPoolAddress;
      this.treasury = treasury;
      this.stakingInst = stakingInst;
    });

    it("Should fail if passed owner's address as zero address", async function () {
      const [ownr] = await ethers.getSigners();
      const LdStaking = await ethers.getContractFactory("LdStaking");
      await expect(
        LdStaking.deploy(5000, "0x0000000000000000000000000000000000000000", this.ldTokenAddress),
      ).to.be.rejectedWith("OwnableInvalidOwner");
    });

    it("Should fail if invalid apr without decimals is passed", async function () {
      const [ownr, treasury] = await ethers.getSigners();
      const LdStaking = await ethers.getContractFactory("LdStaking");
      //This becomes 0.5%
      await expect(LdStaking.deploy(50, ownr, this.ldTokenAddress)).to.be.rejectedWith("InvalidAPR");
    });

    it("Should have correct owner address", async function () {
      expect(this.owner).to.equal(await this.stakingInst.owner());
    });

    it("Should have correct token address", async function () {
      expect(this.ldTokenAddress).to.equal(await this.stakingInst._ldToken());
    });

    it("Should have correct apr Rate", async function () {
      expect(5000).to.equal(await this.stakingInst._aprRate());
    });

    it("Should allow APR change by owner", async function () {
      await this.stakingInst.changeApr("2000");
      expect(2000).to.equal(await this.stakingInst._aprRate());
    });

    it("Should revert when decimals not passed while APR change by owner", async function () {
      await expect(this.stakingInst.changeApr("20")).to.be.rejectedWith("InvalidAPR");
    });

    it("Should revert if non-owner tries to change APR", async function () {
      const stakingInstNonOwner = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr1);
      await expect(stakingInstNonOwner.changeApr("2000")).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should fail if non-owner tries to set pool address", async function () {
      const stakingInst = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr1);
      await expect(stakingInst.setPool(this.rewardPoolAddress)).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should fail if zero address is passed as pool address", async function () {
      await expect(this.stakingInst.setPool(ethers.ZeroAddress)).to.be.rejectedWith("ZeroAddress");
    });

    it("Should revert if non-owner tries to disable staking", async function () {
      const stakingInst = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr1);
      await expect(stakingInst.disableStaking()).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should disable staking when owner disables staking", async function () {
      await this.stakingInst.disableStaking();
      expect(await this.stakingInst.lock()).to.be.true;
    });

    it("Should revert when non-owner enables staking", async function () {
      await this.stakingInst.disableStaking();
      const stakingInst = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr1);
      await expect(stakingInst.enableStaking()).to.be.rejectedWith("OwnableUnauthorizedAccount");
    });

    it("Should enable staking when owner enables staking", async function () {
      await this.stakingInst.disableStaking();
      await this.stakingInst.enableStaking();
      expect(await this.stakingInst.lock()).to.be.false;
    });
  });

  describe("Staking", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldStakingAddress, ldTokenAddress, rewardPoolAddress, stakingInst } =
        await this.loadFixture(deployStakingFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldStakingAddress = ldStakingAddress;
      this.ldTokenAddress = ldTokenAddress;
      this.rewardPoolAddress = rewardPoolAddress;
      this.stakingInst = stakingInst;

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.addr2);
      await ldTokenInst.approve(this.ldStakingAddress, ethers.parseEther("1000000"));

      this.ldTokenInst = ldTokenInst;
    });

    it("Should revert as staking is not started yet", async function () {
      await expect(this.stakingInst.stakeLd(ethers.parseEther("10000"))).to.be.rejectedWith("StakingNotStarted()");
    });

    it("Should increase total staked amount in staking pool", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      await staking.stakeLd(ethers.parseEther("10000"));
      expect(await staking._totalStakedLdAmount()).to.equal(ethers.parseEther("10000").toString());
    });

    it("Should emit Staked event", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      await expect(staking.stakeLd(ethers.parseEther("10000")))
        .to.emit(staking, "Staked")
        .withArgs(this.addr2, ethers.parseEther("10000"));
    });

    it("Should revert staking if staking is disabled", async function () {
      await this.stakingInst.enableStaking();
      await this.stakingInst.disableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);

      await expect(staking.stakeLd(ethers.parseEther("10000"))).to.be.rejectedWith("StakingNotStarted()");
    });

    it("Should decrease balance of staker", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      const balBefore = await this.ldTokenInst.balanceOf(this.addr2);
      await staking.stakeLd(ethers.parseEther("10000"));
      const balAfter = await this.ldTokenInst.balanceOf(this.addr2);
      expect(balBefore - balAfter).to.equal(ethers.parseEther("10000").toString());
    });

    it("Should revert if amount is passed as zero", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      await expect(staking.stakeLd(ethers.parseEther("0"))).to.be.rejectedWith("Invalid amount");
    });

    it("Should increase balance of staking pool", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      const balBefore = await this.ldTokenInst.balanceOf(this.ldStakingAddress);
      await staking.stakeLd(ethers.parseEther("10000"));
      const balAfter = await this.ldTokenInst.balanceOf(this.ldStakingAddress);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("10000").toString());
    });

    it("Should update concerned state variables", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);

      await staking.stakeLd(ethers.parseEther("10000"));
      const stake = await staking.getuserStake(this.addr2.address, 0);

      await staking.stakeLd(ethers.parseEther("1000"));
      const stake2 = await staking.getuserStake(this.addr2.address, 1);

      expect(stake.stakedLdAmount).to.be.equal(ethers.parseEther("10000"));
      expect(stake2.stakedLdAmount).to.be.equal(ethers.parseEther("1000"));
    });
  });

  describe("Claiming", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldStakingAddress, ldTokenAddress, rewardPoolAddress, stakingInst } =
        await this.loadFixture(deployStakingFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldStakingAddress = ldStakingAddress;
      this.ldTokenAddress = ldTokenAddress;
      this.rewardPoolAddress = rewardPoolAddress;
      this.stakingInst = stakingInst;

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.owner);
      // await ldTokenInst.mint();
      await ldTokenInst.approve(ldStakingAddress, ethers.parseEther("1000000"));

      this.ldTokenInst = ldTokenInst;
      await this.stakingInst.enableStaking();
      await this.stakingInst.stakeLd(ethers.parseEther("10000"));
      const stake2 = await this.stakingInst.getuserStake(owner, 0);
      expect(stake2.stakedLdAmount).to.be.equal(ethers.parseEther("10000"));
    });

    it("Should revert if reward pool do not have sufficient funds", async function () {
      const [addr3, addr4] = await ethers.getSigners();
      const LdToken = await ethers.getContractFactory("LdToken");
      const ldtoken = await LdToken.deploy(this.owner, this.addr1, this.addr2, addr3);
      const ldTokenAddress = await ldtoken.getAddress();

      const LdStaking = await ethers.getContractFactory("LdStaking");
      const ldstaking = await LdStaking.deploy(5000, this.owner, ldTokenAddress);
      const ldStakingAddress = await ldstaking.getAddress();

      const rewardPool = await ethers.getContractFactory("RewardPool");
      const rewpool = await rewardPool.deploy(this.owner, ldStakingAddress, ldTokenAddress);
      const rewardPoolAddress = await rewpool.getAddress();

      const stakingInst = new Contract(ldStakingAddress, LdStaking__factory.abi, this.owner);
      await stakingInst.setPool(rewardPoolAddress);
      await stakingInst.enableStaking();

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.owner);

      const tx1 = await ldTokenInst.transfer(addr3, ethers.parseEther("2000000"));

      // const rewardPoolInst = new Contract(rewardPoolAddress, RewardPool__factory.abi, this.owner);
      // await ldTokenInst.approve(rewardPoolAddress, ethers.parseEther("1"));
      // await rewardPoolInst.fundPool(ethers.parseEther("1"));

      const ldTokenaddr3 = new Contract(ldTokenAddress, LdToken__factory.abi, addr3);
      await ldTokenaddr3.approve(ldStakingAddress, ethers.parseEther("2000000"));

      const stakinginst = new Contract(ldStakingAddress, LdStaking__factory.abi, addr3);
      await stakinginst.stakeLd(ethers.parseEther("2000000"));

      await time.increase(7 * 86400);
      await time.increase(7 * 86400);

      await expect(stakinginst.claimRewards(0)).to.be.rejectedWith("InsufficientRewardLiquidity()");
    });

    it("should revert when invalid stake index passed", async function () {
      await time.increase(3 * 86400);
      await expect(this.stakingInst.claimRewards(2)).to.be.rejectedWith("StakeNotFound");
    });

    it("Should revert claim before 7 days", async function () {
      await time.increase(3 * 86400);
      await expect(this.stakingInst.claimRewards(0)).to.be.rejectedWith("ClaimOrUnstakeWindowNotOpen");
    });

    it("Should claim after week ends", async function () {
      await time.increase(7 * 86400);
      await expect(this.stakingInst.claimRewards(0)).to.emit(this.stakingInst, "RewardClaimed");
    });

    it("Should increase user balance", async function () {
      await time.increase(7 * 86400);
      const balanceBefore = await this.ldTokenInst.balanceOf(this.owner);
      await expect(this.stakingInst.claimRewards(0)).to.emit(this.stakingInst, "RewardClaimed");
      const balanceAfter = await this.ldTokenInst.balanceOf(this.owner);
      expect(balanceAfter > balanceBefore).to.be.equal(true);
    });

    it("Should revert claim after 8th day is passed", async function () {
      await time.increase(8 * 86400);
      await expect(this.stakingInst.claimRewards(0)).to.be.rejectedWith("ClaimOrUnstakeWindowNotOpen");
    });

    it("Should update lastClaimed timestamp for user struct", async function () {
      const nextClaim = (await time.latest()) + 7 * 86400;
      await time.setNextBlockTimestamp(nextClaim);
      await this.stakingInst.claimRewards(0);
      const stake2 = await this.stakingInst.getuserStake(this.owner, 0);
      expect(stake2.lastClaimed).to.be.equal(nextClaim);
    });

    it("Should be able to claim after end of any weekly cycle", async function () {
      await time.increase(7 * 86400);
      /// not claimed
      await time.increase(7 * 86400);
      await expect(this.stakingInst.claimRewards(0)).to.emit(this.stakingInst, "RewardClaimed");
    });

    it("Should receive rewards for missed claims in previous weeks", async function () {
      // rewards = 10000*5000/10000
      //for 3 weeks - rewards*3/52
      const expectedRewards = 291244097064178425124n;
      // 3 weeks ahead
      await time.increase(21 * 86400);
      await expect(this.stakingInst.claimRewards(0))
        .to.emit(this.stakingInst, "RewardClaimed")
        .withArgs(this.owner.address, expectedRewards);
    });

    it("Should not inflate exponentially for longer time period", async function () {
      // 166517 as rewrads for 300 weeks at 50% apr
      const expectedRewards = 166517566412835534895572n;
      await time.increase(2100 * 86400);
      await expect(this.stakingInst.claimRewards(0))
        .to.emit(this.stakingInst, "RewardClaimed")
        .withArgs(this.owner.address, expectedRewards);
    });
  });

  describe("Restaking", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldStakingAddress, ldTokenAddress, rewardPoolAddress, stakingInst } =
        await this.loadFixture(deployStakingFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldStakingAddress = ldStakingAddress;
      this.ldTokenAddress = ldTokenAddress;
      this.rewardPoolAddress = rewardPoolAddress;
      this.stakingInst = stakingInst;

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.owner);
      // await ldTokenInst.mint();
      await ldTokenInst.approve(ldStakingAddress, ethers.parseEther("1000000"));

      this.ldTokenInst = ldTokenInst;
      await this.stakingInst.enableStaking();
      await this.stakingInst.stakeLd(ethers.parseEther("10000"));
      const stake2 = await this.stakingInst.getuserStake(owner, 0);
      expect(stake2.stakedLdAmount).to.be.equal(ethers.parseEther("10000"));
    });

    it("Should revert restake before 7 days", async function () {
      await time.increase(3 * 86400);
      await expect(this.stakingInst.reStake(0)).to.be.rejectedWith("ClaimOrUnstakeWindowNotOpen");
    });

    it("Should revert when invalid stake index is passed", async function () {
      await time.increase(3 * 86400);
      await expect(this.stakingInst.reStake(1)).to.be.rejectedWith("StakeNotFound");
    });

    it("Should revert if reward pool do not have sufficient funds", async function () {
      const [addr3, addr4] = await ethers.getSigners();
      const LdToken = await ethers.getContractFactory("LdToken");
      const ldtoken = await LdToken.deploy(this.owner, this.addr1, this.addr2, addr3);
      const ldTokenAddress = await ldtoken.getAddress();

      const LdStaking = await ethers.getContractFactory("LdStaking");
      const ldstaking = await LdStaking.deploy(5000, this.owner, ldTokenAddress);
      const ldStakingAddress = await ldstaking.getAddress();

      const rewardPool = await ethers.getContractFactory("RewardPool");
      const rewpool = await rewardPool.deploy(this.owner, ldStakingAddress, ldTokenAddress);
      const rewardPoolAddress = await rewpool.getAddress();

      const stakingInst = new Contract(ldStakingAddress, LdStaking__factory.abi, this.owner);
      await stakingInst.setPool(rewardPoolAddress);
      await stakingInst.enableStaking();

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.owner);

      const tx1 = await ldTokenInst.transfer(addr3, ethers.parseEther("2000000"));

      // const rewardPoolInst = new Contract(rewardPoolAddress, RewardPool__factory.abi, this.owner);
      // await ldTokenInst.approve(rewardPoolAddress, ethers.parseEther("1"));
      // await rewardPoolInst.fundPool(ethers.parseEther("1"));

      const ldTokenaddr3 = new Contract(ldTokenAddress, LdToken__factory.abi, addr3);
      await ldTokenaddr3.approve(ldStakingAddress, ethers.parseEther("2000000"));

      const stakinginst = new Contract(ldStakingAddress, LdStaking__factory.abi, addr3);
      await stakinginst.stakeLd(ethers.parseEther("2000000"));

      await time.increase(7 * 86400);
      await time.increase(7 * 86400);

      await expect(stakinginst.reStake(0)).to.be.rejectedWith("InsufficientRewardLiquidity()");
    });

    it("Should restake after week ends", async function () {
      await time.increase(7 * 86400);
      await expect(this.stakingInst.reStake(0)).to.emit(this.stakingInst, "RewardClaimed");
    });

    it("Should increase staking contract balance on restake", async function () {
      await time.increase(7 * 86400);
      const balanceBefore = await this.ldTokenInst.balanceOf(this.ldStakingAddress);
      await expect(this.stakingInst.reStake(0)).to.emit(this.stakingInst, "RewardClaimed");
      const balanceAfter = await this.ldTokenInst.balanceOf(this.ldStakingAddress);
      expect(balanceAfter > balanceBefore).to.be.equal(true);
    });

    it("Should revert claim after 8th day is passed", async function () {
      await time.increase(8 * 86400);
      await expect(this.stakingInst.reStake(0)).to.be.rejectedWith("ClaimOrUnstakeWindowNotOpen");
    });

    it("Should update lastClaimed timestamp for user struct after restake", async function () {
      const nextClaim = (await time.latest()) + 7 * 86400;
      await time.setNextBlockTimestamp(nextClaim);
      await this.stakingInst.reStake(0);
      const stake2 = await this.stakingInst.getuserStake(this.owner, 0);
      expect(stake2.lastClaimed).to.be.equal(nextClaim);
    });

    it("Should be able to restake after end of any weekly cycle", async function () {
      await time.increase(7 * 86400);
      /// not claimed
      await time.increase(7 * 86400);
      await expect(this.stakingInst.reStake(0)).to.emit(this.stakingInst, "RewardClaimed");
    });

    it("Should be able to restake rewards missed in previous weeks", async function () {
      // rewards = 10000*5000/10000
      //for 3 weeks - rewards*3/52
      const expectedRewards = 291244097064178425124n;
      // 3 weeks ahead
      await time.increase(21 * 86400);
      await expect(this.stakingInst.reStake(0))
        .to.emit(this.stakingInst, "RewardClaimed")
        .withArgs(this.owner.address, expectedRewards);
    });
  });

  describe("Unstaking", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldStakingAddress, ldTokenAddress, rewardPoolAddress, treasury, stakingInst } =
        await this.loadFixture(deployStakingFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldStakingAddress = ldStakingAddress;
      this.ldTokenAddress = ldTokenAddress;
      this.rewardPoolAddress = rewardPoolAddress;
      this.treasury = treasury;
      this.stakingInst = stakingInst;

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.addr2);
      await ldTokenInst.approve(this.ldStakingAddress, ethers.parseEther("1000000"));

      this.ldTokenInst = ldTokenInst;
    });

    it("Should revert unstake as unstake window not open yet ", async function () {
      const amount = ethers.parseEther("100");
      await this.stakingInst.enableStaking();
      await this.stakingInst.connect(this.addr2).stakeLd(amount);
      await expect(this.stakingInst.connect(this.addr2).unstakeLD(amount, 0)).to.be.revertedWithCustomError(
        this.stakingInst,
        "ClaimOrUnstakeWindowNotOpen",
      ); //  0 is index of stake position
    });

    it("Should revert if unstake amount is less than staked amount ", async function () {
      const amount = ethers.parseEther("100");
      await this.stakingInst.enableStaking();
      await this.stakingInst.connect(this.addr2).stakeLd(amount);
      // Skip one day
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 86400 seconds = 1 day
      await ethers.provider.send("evm_mine"); // Mine a block to update the state
      await expect(
        this.stakingInst.connect(this.addr2).unstakeLD(ethers.parseEther("101"), 0),
      ).to.be.revertedWithCustomError(this.stakingInst, "NotsufficientStake"); //  0 is index of stake position
    });

    it("Should revert if invalid stake index is passed ", async function () {
      const amount = ethers.parseEther("100");
      await this.stakingInst.enableStaking();
      await this.stakingInst.connect(this.addr2).stakeLd(amount);
      // Skip one day
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 86400 seconds = 1 day
      await ethers.provider.send("evm_mine"); // Mine a block to update the state
      await expect(this.stakingInst.connect(this.addr2).unstakeLD(ethers.parseEther("101"), 2)).to.be.rejectedWith(
        "StakeNotFound",
      ); //  0 is index of stake position
    });

    it("Should unstake amount ", async function () {
      const amount = ethers.parseEther("100");

      await this.stakingInst.enableStaking();
      await this.stakingInst.connect(this.addr2).stakeLd(amount);
      // Skip one day
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 86400 seconds = 1 day
      await ethers.provider.send("evm_mine"); // Mine a block to update the state

      const balBefore = await this.ldTokenInst.balanceOf(this.addr2);
      const balBeforeContract = await this.ldTokenInst.balanceOf(this.ldStakingAddress);

      await this.stakingInst.connect(this.addr2).unstakeLD(ethers.parseEther("50"), 0);
      const balAfter = await this.ldTokenInst.balanceOf(this.addr2);
      const balAfterContract = await this.ldTokenInst.balanceOf(this.ldStakingAddress);

      // user balance
      expect(balAfter - balBefore).to.equal(ethers.parseEther("50").toString());

      // staking contract balance
      expect(balBeforeContract - balAfterContract).to.equal(ethers.parseEther("50").toString());

      const user2Stakes = await this.stakingInst._stakeByUser(this.addr2.address, 0); // 0 is the index of user staking

      expect(user2Stakes.stakedLdAmount).to.equal(ethers.parseEther("50"));
    });

    it("Should emit the Unstaked event after unstakeLD", async function () {
      const amount = ethers.parseEther("100");

      await this.stakingInst.enableStaking();
      await this.stakingInst.connect(this.addr2).stakeLd(amount);
      // Skip one day
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 86400 seconds = 1 day
      await ethers.provider.send("evm_mine"); // Mine a block to update the state
      await expect(this.stakingInst.connect(this.addr2).unstakeLD(amount, 0))
        .to.emit(this.stakingInst, "Unstake")
        .withArgs(this.addr2.address, amount);
    });
  });
});
