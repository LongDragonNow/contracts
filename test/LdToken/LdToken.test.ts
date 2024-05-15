import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { deployTokenFixture } from "./LdToken.fixture";

describe("LdToken", function () {
  before(async function () {
    this.loadFixture = loadFixture;
  });

  describe("Deployment", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldTokenAddress, ldTokenInst, liquidityPoolWallet, reflectionWallet, ecoWallet } =
        await this.loadFixture(deployTokenFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldTokenAddress = ldTokenAddress;
      this.ldTokenInst = ldTokenInst;
      this.liquidityPoolWallet = liquidityPoolWallet;
      this.reflectionWallet = reflectionWallet;
      this.ecoWallet = ecoWallet;
    });

    it("Should set the right owner", async function () {
      expect(await this.ldTokenInst.owner()).to.equal(this.owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await this.ldTokenInst.balanceOf(this.owner.address);
      expect(await this.ldTokenInst.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set the right tax exemption and exclusion settings for initial addresses", async function () {
      expect(await this.ldTokenInst._isTaxExempt(this.owner.address)).to.equal(true);
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.owner.address)).to.equal(true);
      expect(await this.ldTokenInst._isTaxExempt(this.liquidityPoolWallet.address)).to.equal(true);
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.liquidityPoolWallet.address)).to.equal(true);
      expect(await this.ldTokenInst._isTaxExempt(this.reflectionWallet.address)).to.equal(true);
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.reflectionWallet.address)).to.equal(true);
      expect(await this.ldTokenInst._isTaxExempt(this.ecoWallet.address)).to.equal(true);
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.ecoWallet.address)).to.equal(true);
    });
  });

  describe("Transactions", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldTokenAddress, ldTokenInst, liquidityPoolWallet, reflectionWallet, ecoWallet } =
        await this.loadFixture(deployTokenFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldTokenAddress = ldTokenAddress;
      this.ldTokenInst = ldTokenInst;
      this.liquidityPoolWallet = liquidityPoolWallet;
      this.reflectionWallet = reflectionWallet;
      this.ecoWallet = ecoWallet;
    });

    it("Should transfer tokens between accounts", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("50"));
      const addr1Balance = await this.ldTokenInst.balanceOf(this.addr1.address);
      expect(addr1Balance).to.equal(ethers.parseEther("50"));

      await this.ldTokenInst.connect(this.addr1).transfer(this.addr2.address, ethers.parseEther("50"));
      const addr2Balance = await this.ldTokenInst.balanceOf(this.addr2.address);
      expect(addr2Balance).to.equal(ethers.parseEther("50"));
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      await expect(this.ldTokenInst.connect(this.addr1).transfer(this.owner.address, 1)).to.be.revertedWithCustomError(
        this.ldTokenInst,
        "ERC20InsufficientBalance",
      );
    });

    it("Should apply tax on transactions involving the swap pair", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("100"));
      const swapPair = await this.ldTokenInst.swapPair();

      const initialBalance = await this.ldTokenInst.balanceOf(swapPair);
      const liquidityPoolBalance = await this.ldTokenInst.balanceOf(this.liquidityPoolWallet.address);
      const reflectionWalletBalance = await this.ldTokenInst.balanceOf(this.reflectionWallet.address);
      const ecoWalletBalance = await this.ldTokenInst.balanceOf(this.ecoWallet.address);

      await this.ldTokenInst.connect(this.addr1).transfer(swapPair, ethers.parseEther("10"));
      const finalBalance = await this.ldTokenInst.balanceOf(swapPair);
      const liquidityPoolBalanceAfterTax = await this.ldTokenInst.balanceOf(this.liquidityPoolWallet.address);
      const reflectionWalletBalanceAfterTax = await this.ldTokenInst.balanceOf(this.reflectionWallet.address);
      const ecoWalletBalanceAfterTax = await this.ldTokenInst.balanceOf(this.ecoWallet.address);

      const taxPercent = await this.ldTokenInst._taxPercentage();
      const taxAmount = (ethers.parseEther("10") * taxPercent) / BigInt(100);
      const expectedFinalBalance = initialBalance + (ethers.parseEther("10") - taxAmount);

      const liquidityTax = await this.ldTokenInst._liquidityTaxPercentage();
      const reflectionsTax = await this.ldTokenInst._reflectionsTaxPercentage();
      const ecoTax = await this.ldTokenInst._ecosystemTaxPercentage();

      const liquidityTaxAmount = (taxAmount * liquidityTax) / BigInt(100);
      const reflectionsTaxAmount = (taxAmount * reflectionsTax) / BigInt(100);
      const ecoTaxAmount = (taxAmount * ecoTax) / BigInt(100);

      expect(liquidityPoolBalanceAfterTax).to.equal(liquidityPoolBalance + liquidityTaxAmount);
      expect(reflectionWalletBalanceAfterTax).to.equal(reflectionWalletBalance + reflectionsTaxAmount);
      expect(ecoWalletBalanceAfterTax).to.equal(ecoWalletBalance + ecoTaxAmount);

      expect(finalBalance).to.equal(expectedFinalBalance);
    });

    it("Should not apply tax if either sender or recipient is tax exempt", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("100"));
      const swapPair = await this.ldTokenInst.swapPair();

      await this.ldTokenInst.connect(this.owner).setTaxExemption(this.addr1.address, true);

      const initialWalletBalance = await this.ldTokenInst.balanceOf(this.addr1.address);
      const initialBalance = await this.ldTokenInst.balanceOf(swapPair);
      const liquidityPoolBalance = await this.ldTokenInst.balanceOf(this.liquidityPoolWallet.address);
      const reflectionWalletBalance = await this.ldTokenInst.balanceOf(this.reflectionWallet.address);
      const ecoWalletBalance = await this.ldTokenInst.balanceOf(this.ecoWallet.address);

      await this.ldTokenInst.connect(this.addr1).transfer(swapPair, ethers.parseEther("10"));

      const finalWalletBalance = await this.ldTokenInst.balanceOf(this.addr1.address);
      const finalBalance = await this.ldTokenInst.balanceOf(swapPair);
      const liquidityPoolBalanceAfterTax = await this.ldTokenInst.balanceOf(this.liquidityPoolWallet.address);
      const reflectionWalletBalanceAfterTax = await this.ldTokenInst.balanceOf(this.reflectionWallet.address);
      const ecoWalletBalanceAfterTax = await this.ldTokenInst.balanceOf(this.ecoWallet.address);
      const expectedFinalBalance = initialBalance + ethers.parseEther("10");

      expect(finalWalletBalance).to.equal(initialWalletBalance - ethers.parseEther("10"));
      expect(liquidityPoolBalanceAfterTax).to.equal(liquidityPoolBalance);
      expect(reflectionWalletBalanceAfterTax).to.equal(reflectionWalletBalance);
      expect(ecoWalletBalanceAfterTax).to.equal(ecoWalletBalance);

      expect(finalBalance).to.equal(expectedFinalBalance);
    });
  });

  describe("Tax and Anti-Snipe Settings", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldTokenAddress, ldTokenInst, liquidityPoolWallet, reflectionWallet, ecoWallet } =
        await this.loadFixture(deployTokenFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldTokenAddress = ldTokenAddress;
      this.ldTokenInst = ldTokenInst;
      this.liquidityPoolWallet = liquidityPoolWallet;
      this.reflectionWallet = reflectionWallet;
      this.ecoWallet = ecoWallet;
    });

    it("Should allow the owner to update the tax percentage", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxPercentage(10);
      expect(await this.ldTokenInst._taxPercentage()).to.equal(10);
    });

    it("Should revert if non-owner tries to update the tax percentage", async function () {
      await expect(this.ldTokenInst.connect(this.addr1).setTaxPercentage(10)).to.be.revertedWithCustomError(
        this.ldTokenInst,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should allow the owner to update the tax distribution", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxDistribution(50, 30, 20);
      expect(await this.ldTokenInst._liquidityTaxPercentage()).to.equal(50);
      expect(await this.ldTokenInst._reflectionsTaxPercentage()).to.equal(30);
      expect(await this.ldTokenInst._ecosystemTaxPercentage()).to.equal(20);
    });

    it("Should revert if total tax distribution percentages do not add up to 100", async function () {
      await expect(this.ldTokenInst.connect(this.owner).setTaxDistribution(40, 30, 20)).to.be.revertedWith(
        "Total tax percentage must equal 100%",
      );
    });

    it("Should allow the owner to enable or disable the anti-snipe mechanism", async function () {
      await this.ldTokenInst.connect(this.owner).setAntiSnipeEnabled(false);
      expect(await this.ldTokenInst.antiSnipeEnabled()).to.equal(false);
    });
  });

  describe("Max Tokens Per Wallet", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldTokenAddress, ldTokenInst, liquidityPoolWallet, reflectionWallet, ecoWallet } =
        await this.loadFixture(deployTokenFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldTokenAddress = ldTokenAddress;
      this.ldTokenInst = ldTokenInst;
      this.liquidityPoolWallet = liquidityPoolWallet;
      this.reflectionWallet = reflectionWallet;
      this.ecoWallet = ecoWallet;
    });

    it("Should revert if recipient exceeds max wallet token limit with anti-snipe enabled", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("1"));
      await expect(this.ldTokenInst.transfer(this.addr1.address, ethers.parseEther("2000000"))).to.be.revertedWith(
        "Recipient exceeds max wallet token amount.",
      );
    });

    it("Should allow transfers exceeding max wallet token limit if anti-snipe is disabled", async function () {
      await this.ldTokenInst.connect(this.owner).setAntiSnipeEnabled(false);
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("2000000"));
      expect(await this.ldTokenInst.balanceOf(this.addr1.address)).to.equal(ethers.parseEther("2000000"));
    });

    it("Should allow the owner to exclude an address from the max wallet token limit", async function () {
      await this.ldTokenInst.connect(this.owner).setIsExcludedFromMaxWalletToken(this.addr1.address, true);
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.addr1.address)).to.equal(true);
    });

    it("Should revert if non-owner tries to exclude an address from the max wallet token limit", async function () {
      await expect(
        this.ldTokenInst.connect(this.addr1).setIsExcludedFromMaxWalletToken(this.addr2.address, true),
      ).to.be.revertedWithCustomError(this.ldTokenInst, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning Tokens", async function () {
    beforeEach(async function () {
      const { owner, addr1, addr2, ldTokenAddress, ldTokenInst, liquidityPoolWallet, reflectionWallet, ecoWallet } =
        await this.loadFixture(deployTokenFixture);
      this.owner = owner;
      this.addr1 = addr1;
      this.addr2 = addr2;
      this.ldTokenAddress = ldTokenAddress;
      this.ldTokenInst = ldTokenInst;
      this.liquidityPoolWallet = liquidityPoolWallet;
      this.reflectionWallet = reflectionWallet;
      this.ecoWallet = ecoWallet;
    });

    it("Should allow token holders to burn their tokens", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("100"));
      await this.ldTokenInst.connect(this.addr1).burn(ethers.parseEther("50"));
      expect(await this.ldTokenInst.balanceOf(this.addr1.address)).to.equal(ethers.parseEther("50"));
    });

    it("Should reduce the total supply when tokens are burned", async function () {
      const initialTotalSupply = await this.ldTokenInst.totalSupply();
      await this.ldTokenInst.connect(this.owner).burn(ethers.parseEther("100"));
      expect(await this.ldTokenInst.totalSupply()).to.equal(initialTotalSupply - ethers.parseEther("100"));
    });
  });
});
