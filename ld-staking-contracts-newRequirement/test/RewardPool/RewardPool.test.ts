import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

import { RewardPool__factory } from "../../types";
import { Signers } from "../types";
import { rewardPoolFixtures } from "./Rewardpool.fixture";

describe("Reward Pool tests", () => {
  before(async function () {
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.admin = signers[0];

    this.loadFixture = loadFixture;
  });

  beforeEach(async function () {
    const { owner, addr1, rewardPoolInst, ldTokenInst, rewardPoolAddress } = await this.loadFixture(rewardPoolFixtures);
    this.owner = owner;
    this.addr1 = addr1;
    this.rewardPoolInst = rewardPoolInst;
    this.ldTokenInst = ldTokenInst;
    this.rewardPoolAddress = rewardPoolAddress;
  });

  it("Should be able to fund pool by owner", async function () {
    await this.ldTokenInst.approve(this.rewardPoolAddress, ethers.parseEther("1000000"));
    await this.rewardPoolInst.fundPool(ethers.parseEther("100000"));
    expect(await this.ldTokenInst.balanceOf(this.rewardPoolAddress)).to.be.equal(ethers.parseEther("100000"));
  });

  it("Should revert when fund pool by non owner", async function () {
    await this.ldTokenInst.approve(this.rewardPoolAddress, ethers.parseEther("1000000"));
    const rewardPoolContract = new Contract(this.rewardPoolAddress, RewardPool__factory.abi, this.addr1);
    await expect(rewardPoolContract.fundPool(ethers.parseEther("100000"))).to.be.rejectedWith(
      "OwnableUnauthorizedAccount",
    );
  });

  it("Should update related storage variable", async function () {
    await this.ldTokenInst.approve(this.rewardPoolAddress, ethers.parseEther("1000000"));
    await this.rewardPoolInst.fundPool(ethers.parseEther("100000"));
    const pooled = await this.rewardPoolInst._pooledLdAmount();
    expect(pooled).to.be.equal(ethers.parseEther("100000"));
    expect(await this.ldTokenInst.balanceOf(this.rewardPoolAddress)).to.be.equal(ethers.parseEther("100000"));
  });

  it("Should be able to withdraw tokens by owner", async function () {
    await this.ldTokenInst.approve(this.rewardPoolAddress, ethers.parseEther("1000000"));
    await this.rewardPoolInst.fundPool(ethers.parseEther("100000"));

    expect(await this.ldTokenInst.balanceOf(this.rewardPoolAddress)).to.be.equal(ethers.parseEther("100000"));
    const ownerBalbefore = await this.ldTokenInst.balanceOf(this.owner.address);
    await this.rewardPoolInst.withdrawRemainingTokens();
    const ownerBalafter = await this.ldTokenInst.balanceOf(this.owner.address);

    expect(ownerBalafter - ownerBalbefore).to.be.equal(ethers.parseEther("100000"));
    expect(await this.ldTokenInst.balanceOf(this.rewardPoolAddress)).to.be.equal(ethers.parseEther("0"));
  });

  it("Should revert when withdraw fund by non owner", async function () {
    await this.ldTokenInst.approve(this.rewardPoolAddress, ethers.parseEther("1000000"));
    await this.rewardPoolInst.fundPool(ethers.parseEther("100000"));
    const rewardPoolContract = new Contract(this.rewardPoolAddress, RewardPool__factory.abi, this.addr1);
    await expect(rewardPoolContract.withdrawRemainingTokens()).to.be.rejectedWith("OwnableUnauthorizedAccount");
  });
});
