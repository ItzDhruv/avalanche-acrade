const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Dtoken", function () {
  async function deployDtokenFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const Dtoken = await ethers.getContractFactory("Dtoken");
    const dtoken = await Dtoken.deploy();

    return { dtoken, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { owner, dtoken } = await loadFixture(deployDtokenFixture);
      expect(await dtoken.owner()).to.equal(owner.address);
    });

    it("Should have correct token name and symbol", async function () {
      const { dtoken } = await loadFixture(deployDtokenFixture);
      expect(await dtoken.name()).to.equal("Dragon Token");
      expect(await dtoken.symbol()).to.equal("DT");
    });

    it("Should have correct decimals", async function () {
      const { dtoken } = await loadFixture(deployDtokenFixture);
      expect(await dtoken.decimals()).to.equal(18);
    });

    it("Should mint initial supply to contract", async function () {
      const { dtoken } = await loadFixture(deployDtokenFixture);
      const contractBalance = await dtoken.balanceOf(dtoken.target);
      expect(contractBalance).to.equal(ethers.parseEther("1000000")); // 1M tokens
    });

    it("Should have correct total supply", async function () {
      const { dtoken } = await loadFixture(deployDtokenFixture);
      const totalSupply = await dtoken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000")); // 1M tokens
    });
  });

  describe("Buy Token Functionality", function () {
    it("Should buy tokens with correct ETH amount", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const ethAmount = ethers.parseEther("0.0002"); // Price for 1 token
      
      await expect(dtoken.connect(user1).buyToken({ value: ethAmount }))
        .to.emit(dtoken, "ButToken")
        .withArgs(user1.address, 1n);
      
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should buy multiple tokens with higher ETH amount", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const ethAmount = ethers.parseEther("0.001"); // Price for 5 tokens (0.001 / 0.0002 = 5)
      
      await expect(dtoken.connect(user1).buyToken({ value: ethAmount }))
        .to.emit(dtoken, "ButToken")
        .withArgs(user1.address, 5n);
      
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("5"));
    });

    it("Should revert when no ETH is sent", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      await expect(dtoken.connect(user1).buyToken({ value: 0 }))
        .to.be.revertedWith("You need to send some ETH");
    });

    it("Should handle fractional ETH amounts correctly", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const ethAmount = ethers.parseEther("0.00025"); // 0.00025 / 0.0002 = 1.25, should give 1 token
      
      await dtoken.connect(user1).buyToken({ value: ethAmount });
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should update contract ETH balance after purchase", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const ethAmount = ethers.parseEther("0.0002");
      
      const initialBalance = await ethers.provider.getBalance(dtoken.target);
      await dtoken.connect(user1).buyToken({ value: ethAmount });
      const finalBalance = await ethers.provider.getBalance(dtoken.target);
      
      expect(finalBalance - initialBalance).to.equal(ethAmount);
    });

    it("Should reduce contract token balance after purchase", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const ethAmount = ethers.parseEther("0.002"); // 10 tokens
      
      const initialContractBalance = await dtoken.balanceOf(dtoken.target);
      await dtoken.connect(user1).buyToken({ value: ethAmount });
      const finalContractBalance = await dtoken.balanceOf(dtoken.target);
      
      expect(initialContractBalance - finalContractBalance).to.equal(ethers.parseEther("10"));
    });

    it("Should allow multiple users to buy tokens", async function () {
      const { dtoken, user1, user2 } = await loadFixture(deployDtokenFixture);
      
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0002") });
      await dtoken.connect(user2).buyToken({ value: ethers.parseEther("0.0004") });
      
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
      expect(await dtoken.balanceOf(user2.address)).to.equal(ethers.parseEther("2"));
    });

    it("Should handle large token purchases", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const ethAmount = ethers.parseEther("0.2"); // 1000 tokens
      
      await dtoken.connect(user1).buyToken({ value: ethAmount });
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Play Game Functionality", function () {
    it("Should allow user with sufficient tokens to play game", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      // First buy tokens
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0002") });
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
      
      // Then play game
      await dtoken.connect(user1).playGame();
      expect(await dtoken.balanceOf(user1.address)).to.equal(0);
    });

    it("Should revert when user has insufficient tokens", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      await expect(dtoken.connect(user1).playGame())
        .to.be.revertedWith("Not enough tokens to play");
    });

    it("Should transfer 1 token from user to contract when playing", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      // Buy 2 tokens
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0004") });
      
      const initialUserBalance = await dtoken.balanceOf(user1.address);
      const initialContractBalance = await dtoken.balanceOf(dtoken.target);
      
      await dtoken.connect(user1).playGame();
      
      const finalUserBalance = await dtoken.balanceOf(user1.address);
      const finalContractBalance = await dtoken.balanceOf(dtoken.target);
      
      expect(initialUserBalance - finalUserBalance).to.equal(ethers.parseEther("1"));
      expect(finalContractBalance - initialContractBalance).to.equal(ethers.parseEther("1"));
    });

    it("Should allow multiple game plays if user has enough tokens", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      // Buy 3 tokens
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0006") });
      
      await dtoken.connect(user1).playGame(); // First game
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("2"));
      
      await dtoken.connect(user1).playGame(); // Second game
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
      
      await dtoken.connect(user1).playGame(); // Third game
      expect(await dtoken.balanceOf(user1.address)).to.equal(0);
    });

    it("Should revert on fourth game attempt with no tokens left", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      // Buy 1 token and play once
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0002") });
      await dtoken.connect(user1).playGame();
      
      // Should revert on second attempt
      await expect(dtoken.connect(user1).playGame())
        .to.be.revertedWith("Not enough tokens to play");
    });
  });

  describe("Withdrawal Functionality", function () {
    it("Should allow owner to withdraw contract balance", async function () {
      const { dtoken, owner, user1 } = await loadFixture(deployDtokenFixture);
      
      // First, user buys tokens to add ETH to contract
      const ethAmount = ethers.parseEther("0.001");
      await dtoken.connect(user1).buyToken({ value: ethAmount });
      
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(dtoken.target);
      
      const tx = await dtoken.connect(owner).withdrwal();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalOwnerBalance + gasUsed - initialOwnerBalance).to.equal(contractBalance);
      expect(await ethers.provider.getBalance(dtoken.target)).to.equal(0);
    });

    it("Should revert when non-owner tries to withdraw", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      await expect(dtoken.connect(user1).withdrwal())
        .to.be.revertedWith("Only owner can withdrwal");
    });

    it("Should allow withdrawal even when contract has zero balance", async function () {
      const { dtoken, owner } = await loadFixture(deployDtokenFixture);
      
      // No tokens bought, so contract should have 0 ETH balance
      await expect(dtoken.connect(owner).withdrwal()).to.not.be.reverted;
    });

    it("Should handle multiple withdrawals", async function () {
      const { dtoken, owner, user1, user2 } = await loadFixture(deployDtokenFixture);
      
      // First purchase and withdrawal
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0002") });
      await dtoken.connect(owner).withdrwal();
      expect(await ethers.provider.getBalance(dtoken.target)).to.equal(0);
      
      // Second purchase and withdrawal
      await dtoken.connect(user2).buyToken({ value: ethers.parseEther("0.0004") });
      await dtoken.connect(owner).withdrwal();
      expect(await ethers.provider.getBalance(dtoken.target)).to.equal(0);
    });
  });

  describe("Get Balance Functionality", function () {
    it("Should return correct balance for user with no tokens", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      expect(await dtoken.connect(user1).getBalance()).to.equal(0);
    });

    it("Should return correct balance for user with tokens", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.001") });
      expect(await dtoken.connect(user1).getBalance()).to.equal(ethers.parseEther("5"));
    });

    it("Should return updated balance after playing game", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0004") });
      expect(await dtoken.connect(user1).getBalance()).to.equal(ethers.parseEther("2"));
      
      await dtoken.connect(user1).playGame();
      expect(await dtoken.connect(user1).getBalance()).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Edge Cases and Integration Tests", function () {
    it("Should handle very small ETH amounts", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const smallAmount = "100000000000000"; // Less than token price
      
      await dtoken.connect(user1).buyToken({ value: smallAmount });
      expect(await dtoken.balanceOf(user1.address)).to.equal(0); // Should get 0 tokens
    });

    it("Should handle exact token price", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      const exactPrice = "200000000000000"; // Exact price for 1 token
      
      await dtoken.connect(user1).buyToken({ value: exactPrice });
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("Should handle the complete user journey", async function () {
      const { dtoken, owner, user1 } = await loadFixture(deployDtokenFixture);
      
      // Step 1: User buys tokens
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0006") });
      expect(await dtoken.connect(user1).getBalance()).to.equal(ethers.parseEther("3"));
      
      // Step 2: User plays game multiple times
      await dtoken.connect(user1).playGame();
      expect(await dtoken.connect(user1).getBalance()).to.equal(ethers.parseEther("2"));
      
      await dtoken.connect(user1).playGame();
      expect(await dtoken.connect(user1).getBalance()).to.equal(ethers.parseEther("1"));
      
      // Step 3: Owner withdraws accumulated ETH
      const contractETHBefore = await ethers.provider.getBalance(dtoken.target);
      expect(contractETHBefore).to.equal(ethers.parseEther("0.0006"));
      
      await dtoken.connect(owner).withdrwal();
      expect(await ethers.provider.getBalance(dtoken.target)).to.equal(0);
      
      // Step 4: User continues to play with remaining tokens
      await dtoken.connect(user1).playGame();
      expect(await dtoken.connect(user1).getBalance()).to.equal(0);
      
      // Step 5: User tries to play again but fails
      await expect(dtoken.connect(user1).playGame())
        .to.be.revertedWith("Not enough tokens to play");
    });

    it("Should handle contract running out of tokens", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      // Verify initial contract token balance
      const availableTokens = await dtoken.balanceOf(dtoken.target);
      expect(availableTokens).to.equal(ethers.parseEther("1000000"));
      
      // Buy a reasonable amount to test the calculation
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("1") });
      
      // Calculate expected tokens: 1 ETH / 0.0002 ETH per token = 5000 tokens
      const tokenPriceInWei = BigInt("200000000000000"); // 0.0002 ETH in wei
      const ethSentInWei = ethers.parseEther("1");
      const expectedTokenCount = ethSentInWei / tokenPriceInWei; // This gives us 5000
      const expectedTokenBalance = expectedTokenCount * ethers.parseEther("1") / BigInt("1000000000000000000"); // Convert to token units
      
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("5000"));
    });

    it("Should maintain correct token accounting across multiple users", async function () {
      const { dtoken, user1, user2, user3 } = await loadFixture(deployDtokenFixture);
      
      const initialContractBalance = await dtoken.balanceOf(dtoken.target);
      
      // Multiple users buy tokens
      await dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0002") }); // 1 token
      await dtoken.connect(user2).buyToken({ value: ethers.parseEther("0.0004") }); // 2 tokens
      await dtoken.connect(user3).buyToken({ value: ethers.parseEther("0.0006") }); // 3 tokens
      
      // Verify individual balances
      expect(await dtoken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
      expect(await dtoken.balanceOf(user2.address)).to.equal(ethers.parseEther("2"));
      expect(await dtoken.balanceOf(user3.address)).to.equal(ethers.parseEther("3"));
      
      // Verify contract balance decreased correctly
      const finalContractBalance = await dtoken.balanceOf(dtoken.target);
      expect(initialContractBalance - finalContractBalance).to.equal(ethers.parseEther("6"));
      
      // Users play games
      await dtoken.connect(user1).playGame(); // user1: 0 tokens
      await dtoken.connect(user2).playGame(); // user2: 1 token
      await dtoken.connect(user3).playGame(); // user3: 2 tokens
      
      // Verify final balances
      expect(await dtoken.balanceOf(user1.address)).to.equal(0);
      expect(await dtoken.balanceOf(user2.address)).to.equal(ethers.parseEther("1"));
      expect(await dtoken.balanceOf(user3.address)).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Events Testing", function () {
    it("Should emit ButToken event with correct parameters", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      await expect(dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0006") }))
        .to.emit(dtoken, "ButToken")
        .withArgs(user1.address, 3n);
    });

    it("Should emit multiple events for multiple purchases", async function () {
      const { dtoken, user1 } = await loadFixture(deployDtokenFixture);
      
      const tx1 = dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0002") });
      await expect(tx1).to.emit(dtoken, "ButToken").withArgs(user1.address, 1n);
      
      const tx2 = dtoken.connect(user1).buyToken({ value: ethers.parseEther("0.0004") });
      await expect(tx2).to.emit(dtoken, "ButToken").withArgs(user1.address, 2n);
    });
  });
});