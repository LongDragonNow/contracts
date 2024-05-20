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

    it("Should revert if initialOwner is zero address", async function () {
      const LdToken = await ethers.getContractFactory("LdToken");
      await expect(
        LdToken.deploy(
          ethers.ZeroAddress,
          this.liquidityPoolWallet.address,
          this.reflectionWallet.address,
          this.ecoWallet.address,
        ),
      ).to.be.revertedWithCustomError(this.ldTokenInst, "OwnableInvalidOwner");
    });

    it("Should revert if liquidityPoolsWallet is zero address", async function () {
      const LdToken = await ethers.getContractFactory("LdToken");
      await expect(
        LdToken.deploy(this.owner.address, ethers.ZeroAddress, this.reflectionWallet.address, this.ecoWallet.address),
      ).to.be.revertedWith("Liquidity pool wallet cannot be the zero address");
    });

    it("Should revert if reflectionsWallet is zero address", async function () {
      const LdToken = await ethers.getContractFactory("LdToken");
      await expect(
        LdToken.deploy(
          this.owner.address,
          this.liquidityPoolWallet.address,
          ethers.ZeroAddress,
          this.ecoWallet.address,
        ),
      ).to.be.revertedWith("Reflections wallet cannot be the zero address");
    });

    it("Should revert if ecosystemDevelopmentWallet is zero address", async function () {
      const LdToken = await ethers.getContractFactory("LdToken");
      await expect(
        LdToken.deploy(
          this.owner.address,
          this.liquidityPoolWallet.address,
          this.reflectionWallet.address,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith("Ecosystem development wallet cannot be the zero address");
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

    it("Should handle transfer without tax when tax percentage is zero", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxPercentage(0);
      const amount = ethers.parseEther("10");

      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, amount);
      const initialBalanceSender = await this.ldTokenInst.balanceOf(this.addr1.address);
      const initialBalanceRecipient = await this.ldTokenInst.balanceOf(this.addr2.address);

      let tx = await this.ldTokenInst.connect(this.addr1).transfer(this.addr2.address, amount);

      let receipt = await tx.wait();

      let eventNames = ["TaxDeducted", "TaxDistributed"];

      let exits = receipt.logs.find((log: { fragment: { name: string } }) => eventNames.includes(log.fragment.name));

      expect(exits).to.be.undefined;

      const finalBalanceSender = await this.ldTokenInst.balanceOf(this.addr1.address);
      const finalBalanceRecipient = await this.ldTokenInst.balanceOf(this.addr2.address);
      const taxAmount = 0n;
      const amountAfterTax = amount - taxAmount;

      expect(finalBalanceSender).to.equal(initialBalanceSender - amount);
      expect(finalBalanceRecipient).to.equal(initialBalanceRecipient + amountAfterTax);

      await expect(this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, amount))
        .to.emit(this.ldTokenInst, "Transfer")
        .withArgs(this.owner.address, this.addr1.address, amount);

      await this.ldTokenInst.connect(this.owner).setTaxPercentage(10);

      const swapPair = await this.ldTokenInst.swapPair();

      tx = await this.ldTokenInst.connect(this.addr1).transfer(swapPair, ethers.parseEther("1"));

      receipt = await tx.wait();

      eventNames = ["TaxDeducted", "TaxDistributed"];

      const events = receipt.logs.map((log: { fragment: { name: string } }) => log.fragment.name);
      exits = events.filter((event: string) => eventNames.includes(event));
      console.log(exits);
      expect(exits).to.contain("TaxDeducted");
      expect(exits).to.contain("TaxDistributed");
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

    it("Should not change state if tax percentage is the same", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxPercentage(10);
      const tx = await this.ldTokenInst.connect(this.owner).setTaxPercentage(10);

      const receipt = await tx.wait();

      const exits = receipt.logs.find(
        (log: { fragment: { name: string } }) => log.fragment.name === "TaxPercentageUpdated",
      );

      expect(exits).to.be.undefined;
      expect(await this.ldTokenInst._taxPercentage()).to.equal(10);
    });

    it("Should revert if non-owner tries to update the tax percentage", async function () {
      await expect(this.ldTokenInst.connect(this.addr1).setTaxPercentage(10)).to.be.revertedWithCustomError(
        this.ldTokenInst,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should allow the owner to set the tax percentage to the maximum allowed value", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxPercentage(25);
      expect(await this.ldTokenInst._taxPercentage()).to.equal(25);
    });

    it("Should revert if the owner tries to set the tax percentage above the maximum allowed value", async function () {
      await expect(this.ldTokenInst.connect(this.owner).setTaxPercentage(26)).to.be.revertedWith(
        "Percentage exceeds maximum",
      );
    });

    it("Should allow the owner to update the tax distribution", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxDistribution(50, 25, 25);
      expect(await this.ldTokenInst._liquidityTaxPercentage()).to.equal(50);
      expect(await this.ldTokenInst._reflectionsTaxPercentage()).to.equal(25);
      expect(await this.ldTokenInst._ecosystemTaxPercentage()).to.equal(25);
    });

    it("Should revert if total tax distribution percentages do not add up to 100", async function () {
      await expect(this.ldTokenInst.connect(this.owner).setTaxDistribution(40, 30, 20)).to.be.revertedWith(
        "Total tax percentage must equal 100%",
      );
    });

    it("Should revert when non-owner tries to set tax distribution", async function () {
      await expect(this.ldTokenInst.connect(this.addr1).setTaxDistribution(50, 30, 20)).to.be.revertedWithCustomError(
        this.ldTokenInst,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should not change state if tax percentages are the same", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxDistribution(50, 30, 20);

      expect(await this.ldTokenInst._liquidityTaxPercentage()).to.equal(50);
      expect(await this.ldTokenInst._reflectionsTaxPercentage()).to.equal(30);
      expect(await this.ldTokenInst._ecosystemTaxPercentage()).to.equal(20);

      const tx = await this.ldTokenInst.connect(this.owner).setTaxDistribution(50, 30, 20);
      const receipt = await tx.wait();

      const eventNames = [
        "TaxPercentageUpdated",
        "LiquidityTaxPercentageUpdated",
        "ReflectionsTaxPercentageUpdated",
        "EcosystemTaxPercentageUpdated",
      ];

      const exits = receipt.logs.find((log: { fragment: { name: string } }) => eventNames.includes(log.fragment.name));

      expect(exits).to.be.undefined;

      expect(await this.ldTokenInst._liquidityTaxPercentage()).to.equal(50);
      expect(await this.ldTokenInst._reflectionsTaxPercentage()).to.equal(30);
      expect(await this.ldTokenInst._ecosystemTaxPercentage()).to.equal(20);
    });

    it("Should allow the owner to enable or disable the anti-snipe mechanism", async function () {
      await this.ldTokenInst.connect(this.owner).setAntiSnipeEnabled(false);
      expect(await this.ldTokenInst.antiSnipeEnabled()).to.equal(false);
    });

    it("Should revert when non-owner tries to enable or disable the anti-snipe mechanism", async function () {
      await this.ldTokenInst.connect(this.owner).setAntiSnipeEnabled(false);
      await expect(this.ldTokenInst.connect(this.addr1).setAntiSnipeEnabled(true)).to.be.revertedWithCustomError(
        this.ldTokenInst,
        "OwnableUnauthorizedAccount",
      );

      expect(await this.ldTokenInst.antiSnipeEnabled()).to.equal(false);
    });

    it("Should not change state if anti-snipe value is the same", async function () {
      const tx = await this.ldTokenInst.connect(this.owner).setAntiSnipeEnabled(true);

      const receipt = await tx.wait();

      const exits = receipt.logs.find(
        (log: { fragment: { name: string } }) => log.fragment.name === "AntiSnipeEnabledUpdated",
      );

      expect(exits).to.be.undefined;

      await this.ldTokenInst.connect(this.owner).setAntiSnipeEnabled(true);
      expect(await this.ldTokenInst.antiSnipeEnabled()).to.equal(true);
    });

    it("Should handle transferFrom with tax and anti-snipe logic", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("100"));
      await this.ldTokenInst.connect(this.addr1).approve(this.addr2.address, ethers.parseEther("50"));

      const swapPair = await this.ldTokenInst.swapPair();

      const initialBalanceSender = await this.ldTokenInst.balanceOf(this.addr1.address);
      const initialBalanceRecipient = await this.ldTokenInst.balanceOf(this.addr2.address);
      const initialBalanceLiquidity = await this.ldTokenInst.balanceOf(this.liquidityPoolWallet.address);
      const initialBalanceReflections = await this.ldTokenInst.balanceOf(this.reflectionWallet.address);
      const initialBalanceEcosystem = await this.ldTokenInst.balanceOf(this.ecoWallet.address);
      const initialBalanceSwapPair = await this.ldTokenInst.balanceOf(swapPair);

      await this.ldTokenInst.connect(this.addr2).transferFrom(this.addr1.address, swapPair, ethers.parseEther("10"));

      const finalBalanceSender = await this.ldTokenInst.balanceOf(this.addr1.address);
      const finalBalanceRecipient = await this.ldTokenInst.balanceOf(this.addr2.address);
      const finalBalanceLiquidity = await this.ldTokenInst.balanceOf(this.liquidityPoolWallet.address);
      const finalBalanceReflections = await this.ldTokenInst.balanceOf(this.reflectionWallet.address);
      const finalBalanceEcosystem = await this.ldTokenInst.balanceOf(this.ecoWallet.address);
      const finalBalanceSwapPair = await this.ldTokenInst.balanceOf(swapPair);

      const taxPercent = await this.ldTokenInst._taxPercentage();
      const amount = ethers.parseEther("10");
      const taxAmount = (amount * taxPercent) / 100n;
      const expectedFinalBalanceSwapPair = initialBalanceSwapPair + amount - taxAmount;

      const liquidityTax = await this.ldTokenInst._liquidityTaxPercentage();
      const reflectionsTax = await this.ldTokenInst._reflectionsTaxPercentage();
      const ecoTax = await this.ldTokenInst._ecosystemTaxPercentage();

      const liquidityTaxAmount = (taxAmount * liquidityTax) / 100n;
      const reflectionsTaxAmount = (taxAmount * reflectionsTax) / 100n;
      const ecoTaxAmount = (taxAmount * ecoTax) / 100n;

      expect(finalBalanceSender).to.equal(initialBalanceSender - amount);
      expect(finalBalanceRecipient).to.equal(initialBalanceRecipient);
      expect(finalBalanceLiquidity).to.equal(initialBalanceLiquidity + liquidityTaxAmount);
      expect(finalBalanceReflections).to.equal(initialBalanceReflections + reflectionsTaxAmount);
      expect(finalBalanceEcosystem).to.equal(initialBalanceEcosystem + ecoTaxAmount);
      expect(finalBalanceSwapPair).to.equal(expectedFinalBalanceSwapPair);
    });

    it("Should revert when non-owner tries to set tax exemption", async function () {
      await expect(
        this.ldTokenInst.connect(this.addr1).setTaxExemption(this.addr2.address, true),
      ).to.be.revertedWithCustomError(this.ldTokenInst, "OwnableUnauthorizedAccount");
    });

    it("Should revert if trying to set tax exemption for the zero address", async function () {
      await expect(this.ldTokenInst.connect(this.owner).setTaxExemption(ethers.ZeroAddress, true)).to.be.revertedWith(
        "Account cannot be the zero address",
      );
    });

    it("Should not change state if tax exemption status is the same", async function () {
      await this.ldTokenInst.connect(this.owner).setTaxExemption(this.addr1.address, true);
      expect(await this.ldTokenInst._isTaxExempt(this.addr1.address)).to.equal(true);
      const tx = await this.ldTokenInst.connect(this.owner).setTaxExemption(this.addr1.address, true);

      const receipt = await tx.wait();

      const exits = receipt.logs.find(
        (log: { fragment: { name: string } }) => log.fragment.name === "TaxExemptionUpdated",
      );

      expect(exits).to.be.undefined;
      expect(await this.ldTokenInst._isTaxExempt(this.addr1.address)).to.equal(true);
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

    it("Should revert if trying to set exclusion for the zero address", async function () {
      await expect(
        this.ldTokenInst.connect(this.owner).setIsExcludedFromMaxWalletToken(ethers.ZeroAddress, true),
      ).to.be.revertedWith("Account cannot be the zero address");
    });

    it("Should revert if trying to set exclusion for the swapPair address", async function () {
      const swapPair = await this.ldTokenInst.swapPair();
      await expect(
        this.ldTokenInst.connect(this.owner).setIsExcludedFromMaxWalletToken(swapPair, true),
      ).to.be.revertedWith("Cannot change state of the swapPair for max wallet token limit");
    });

    it("Should not change state if exclusion state is the same", async function () {
      await this.ldTokenInst.connect(this.owner).setIsExcludedFromMaxWalletToken(this.addr1.address, true);
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.addr1.address)).to.equal(true);

      const tx = await this.ldTokenInst.connect(this.owner).setIsExcludedFromMaxWalletToken(this.addr1.address, true);

      const receipt = await tx.wait();

      const exits = receipt.logs.find(
        (log: { fragment: { name: string } }) => log.fragment.name === "MaxWalletTokenExclusionUpdated",
      );

      expect(exits).to.be.undefined;
      expect(await this.ldTokenInst._isExcludedFromMaxTokensPerWallet(this.addr1.address)).to.equal(true);
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

    it("Should revert if token holder tries to burn more tokens than they have", async function () {
      await this.ldTokenInst.connect(this.owner).transfer(this.addr1.address, ethers.parseEther("50"));
      await expect(this.ldTokenInst.connect(this.addr1).burn(ethers.parseEther("100"))).to.be.revertedWithCustomError(
        this.ldTokenInst,
        "ERC20InsufficientBalance",
      );
    });
  });
});
