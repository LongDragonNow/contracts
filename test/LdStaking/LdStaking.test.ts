import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

import { LdToken__factory, Ownable__factory } from "../../types";
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
        LdStaking.deploy(5000, 12, ownr, "0x0000000000000000000000000000000000000000", this.ldTokenAddress),
      ).to.be.rejectedWith("ZeroAddress");
    });

    it("Should fail if invalid apr without decimals is passed", async function () {
      const [ownr, treasury] = await ethers.getSigners();
      const LdStaking = await ethers.getContractFactory("LdStaking");
      //This becomes 0.5%
      await expect(LdStaking.deploy(50, 12, ownr, treasury, this.ldTokenAddress)).to.be.rejectedWith("InvalidAPR");
    });

    it("Should have correct treasury address", async function () {
      expect(this.treasury).to.equal(await this.stakingInst._treasuryAddress());
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
  });

  describe("Staking", async function () {
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

    it("Should revert as staking is not started yet", async function () {
      await expect(this.stakingInst.stakeLd(ethers.parseEther("10000"))).to.be.rejectedWith("StakingNotStarted");
    });

    it("Should increase total staked amount in staking pool", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      await staking.stakeLd(ethers.parseEther("10000"));
      expect(await staking._totalStakedLdAmount()).to.equal(ethers.parseEther("10000").toString());
    });

    it("Should decrease balance of staker", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      const balBefore = await this.ldTokenInst.balanceOf(this.addr2);
      await staking.stakeLd(ethers.parseEther("10000"));
      const balAfter = await this.ldTokenInst.balanceOf(this.addr2);
      expect(balBefore - balAfter).to.equal(ethers.parseEther("10000").toString());
    });

    it("Should increase balance of pool", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      const balBefore = await this.ldTokenInst.balanceOf(this.rewardPoolAddress);
      await staking.stakeLd(ethers.parseEther("10000"));
      const balAfter = await this.ldTokenInst.balanceOf(this.rewardPoolAddress);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("10000").toString());
    });

    it("Should update concerned state variables", async function () {
      await this.stakingInst.enableStaking();
      const staking = new Contract(this.ldStakingAddress, LdStaking__factory.abi, this.addr2);
      await staking.stakeLd(ethers.parseEther("10000"));
      await staking.stakeLd(ethers.parseEther("10000"));
      const userStake = await staking._stakeByUser(this.addr2);
      expect(userStake.stakedLdAmount).to.equal(ethers.parseEther("20000").toString());
      expect(await staking._totalStakedLdAmount()).to.be.equal(ethers.parseEther("20000").toString());
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

      const ldTokenInst = new Contract(ldTokenAddress, LdToken__factory.abi, this.owner);
      // await ldTokenInst.mint();
      await ldTokenInst.approve(ldStakingAddress, ethers.parseEther("1000000"));

      this.ldTokenInst = ldTokenInst;
      await this.stakingInst.enableStaking();
      await this.stakingInst.stakeLd(ethers.parseEther("10000"));
      expect(await this.stakingInst.getStakedBy(owner)).to.be.equal(ethers.parseEther("10000").toString());
    });

    it("Should not able to unstake before staking ends", async function () {
      await expect(this.stakingInst.unstakeLD(ethers.parseEther("10000"))).to.be.rejectedWith("StakingNotEnded");
    });

    it("Should be able to unstake after staking ends", async function () {
      await this.stakingInst.disableStaking();
      const balanceBefore = await this.ldTokenInst.balanceOf(this.owner);
      await this.stakingInst.unstakeLD(ethers.parseEther("10000"));
      const balanceAfter = await this.ldTokenInst.balanceOf(this.owner);
      expect(balanceAfter - balanceBefore).to.be.equal(ethers.parseEther("10000").toString());
    });

    it("Expects state changes after unstaking", async function () {
      await this.stakingInst.disableStaking();
      const balanceBefore = await this.ldTokenInst.balanceOf(this.owner);
      await this.stakingInst.unstakeLD(ethers.parseEther("10000"));
      const balanceAfter = await this.ldTokenInst.balanceOf(this.owner);
      expect(balanceAfter - balanceBefore).to.be.equal(ethers.parseEther("10000").toString());
      expect(await this.stakingInst.getStakedBy(this.owner)).to.be.equal(0);
    });

    it("Should be able to emergency withdraw after a month", async function () {
      await time.increase(30 * 86400); //advance time ahead in 1 months
      const balanceBefore = await this.ldTokenInst.balanceOf(this.owner);
      await this.stakingInst.emerygencyWithdraw(ethers.parseEther("10000"));
      const balanceAfter = await this.ldTokenInst.balanceOf(this.owner);
      expect(balanceAfter - balanceBefore).to.be.equal(ethers.parseEther("7000").toString());
    });

    it("Should not be able to emergency withdraw before a month", async function () {
      //Not increasing timestamp
      //await time.increase(30 * 86400);
      await expect(this.stakingInst.emerygencyWithdraw(ethers.parseEther("10000"))).to.be.rejectedWith(
        "MinimumStakeDurationNotElapsed",
      );
    });
  });

  describe("", async function () {});
});
