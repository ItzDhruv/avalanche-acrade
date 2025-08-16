
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("GameScoreNFT", function () {
  async function deployGameScoreNFTFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const GameScoreNFT = await ethers.getContractFactory("GameScoreNFT");
    const gameScoreNFT = await GameScoreNFT.deploy("https://api.example.com/metadata/");

    return { gameScoreNFT, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { owner, gameScoreNFT } = await loadFixture(deployGameScoreNFTFixture);
      expect(await gameScoreNFT.owner()).to.equal(owner.address);
    });

    it("Should set the correct MAX_SCORE", async function () {
      const { gameScoreNFT } = await loadFixture(deployGameScoreNFTFixture);
      expect(await gameScoreNFT.MAX_SCORE()).to.equal(25);
    });

    it("Should set the correct URI", async function () {
      const { gameScoreNFT } = await loadFixture(deployGameScoreNFTFixture);
      expect(await gameScoreNFT.uri(1)).to.equal("https://api.example.com/metadata/");
    });
  });

  describe("Minting Game Score NFTs", function () {
    it("Should mint NFT with valid score", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await expect(gameScoreNFT.connect(user1).mintGameScoreNFT(15))
        .to.emit(gameScoreNFT, "ScoreNFTMinted")
        .withArgs(user1.address, 15, 1);
      
      expect(await gameScoreNFT.balanceOf(user1.address, 15)).to.equal(1);
    });

    it("Should revert with invalid score (too low)", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await expect(gameScoreNFT.connect(user1).mintGameScoreNFT(0))
        .to.be.revertedWith("Invalid score");
    });

    it("Should revert with invalid score (too high)", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await expect(gameScoreNFT.connect(user1).mintGameScoreNFT(26))
        .to.be.revertedWith("Invalid score");
    });

    it("Should mint multiple NFTs with same score (duplicates)", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      
      expect(await gameScoreNFT.balanceOf(user1.address, 10)).to.equal(3);
      expect(await gameScoreNFT.userScoreNFTBalance(user1.address, 10)).to.equal(3);
      expect(await gameScoreNFT.totalMintedPerScore(10)).to.equal(3);
    });

    it("Should mint NFTs with different scores", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(15);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(25);
      
      expect(await gameScoreNFT.balanceOf(user1.address, 5)).to.equal(1);
      expect(await gameScoreNFT.balanceOf(user1.address, 15)).to.equal(1);
      expect(await gameScoreNFT.balanceOf(user1.address, 25)).to.equal(1);
    });
  });

  describe("Tracking User Statistics", function () {
    it("Should correctly track user total score count", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      expect(await gameScoreNFT.userTotalScore(user1.address)).to.equal(1);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10); // duplicate
      expect(await gameScoreNFT.userTotalScore(user1.address)).to.equal(2);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(20); // different score
      expect(await gameScoreNFT.userTotalScore(user1.address)).to.equal(3);
    });

    it("Should track user scores list including duplicates", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5); // duplicate
      await gameScoreNFT.connect(user1).mintGameScoreNFT(15);
      
      const userScores = await gameScoreNFT.getUserScores(user1.address);
      expect(userScores).to.deep.equal([5n, 10n, 5n, 15n]);
    });

    it("Should track total minted per score across all users", async function () {
      const { gameScoreNFT, user1, user2 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user2).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      
      expect(await gameScoreNFT.totalMintedPerScore(10)).to.equal(3);
    });

    it("Should record users in allUsers list", async function () {
      const { gameScoreNFT, user1, user2, user3 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user2).mintGameScoreNFT(15);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(20); // same user, shouldn't duplicate
      
      const [users, totalCounts, scores] = await gameScoreNFT.getAllUserDetails();
      expect(users.length).to.equal(2);
      expect(users[0]).to.equal(user1.address);
      expect(users[1]).to.equal(user2.address);
    });
  });

  describe("View Functions", function () {
    it("Should return correct user score NFTs", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(1);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5); // duplicate
      await gameScoreNFT.connect(user1).mintGameScoreNFT(25);
      
      const [scores, balances] = await gameScoreNFT.connect(user1).getMyScoreNFTs();
      
      expect(scores.length).to.equal(25);
      expect(balances.length).to.equal(25);
      expect(balances[0]).to.equal(1); // score 1
      expect(balances[4]).to.equal(2); // score 5 (index 4)
      expect(balances[24]).to.equal(1); // score 25 (index 24)
      
      // Check other scores are 0
      expect(balances[1]).to.equal(0); // score 2
      expect(balances[9]).to.equal(0); // score 10
    });

    it("Should return all user details correctly", async function () {
      const { gameScoreNFT, user1, user2 } = await loadFixture(deployGameScoreNFTFixture);
      
      // User1 mints
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(15);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10); // duplicate
      
      // User2 mints
      await gameScoreNFT.connect(user2).mintGameScoreNFT(20);
      await gameScoreNFT.connect(user2).mintGameScoreNFT(25);
      
      const [users, totalCounts, scores] = await gameScoreNFT.getAllUserDetails();
      
      expect(users.length).to.equal(2);
      expect(totalCounts.length).to.equal(2);
      expect(scores.length).to.equal(2);
      
      // Check user1 data
      expect(users[0]).to.equal(user1.address);
      expect(totalCounts[0]).to.equal(3);
      expect(scores[0]).to.deep.equal([10n, 15n, 10n]);
      
      // Check user2 data
      expect(users[1]).to.equal(user2.address);
      expect(totalCounts[1]).to.equal(2);
      expect(scores[1]).to.deep.equal([20n, 25n]);
    });

    it("Should return empty arrays for user with no NFTs", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      const userScores = await gameScoreNFT.getUserScores(user1.address);
      expect(userScores).to.deep.equal([]);
      
      expect(await gameScoreNFT.userTotalScore(user1.address)).to.equal(0);
    });
  });

  describe("Edge Cases and Boundary Tests", function () {
    it("Should handle minimum score (1)", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(1);
      expect(await gameScoreNFT.balanceOf(user1.address, 1)).to.equal(1);
    });

    it("Should handle maximum score (25)", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(25);
      expect(await gameScoreNFT.balanceOf(user1.address, 25)).to.equal(1);
    });

    it("Should handle multiple users minting same score", async function () {
      const { gameScoreNFT, user1, user2, user3 } = await loadFixture(deployGameScoreNFTFixture);
      
      await gameScoreNFT.connect(user1).mintGameScoreNFT(15);
      await gameScoreNFT.connect(user2).mintGameScoreNFT(15);
      await gameScoreNFT.connect(user3).mintGameScoreNFT(15);
      
      expect(await gameScoreNFT.totalMintedPerScore(15)).to.equal(3);
      expect(await gameScoreNFT.balanceOf(user1.address, 15)).to.equal(1);
      expect(await gameScoreNFT.balanceOf(user2.address, 15)).to.equal(1);
      expect(await gameScoreNFT.balanceOf(user3.address, 15)).to.equal(1);
    });

    it("Should handle large number of mints by single user", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      // Mint same score multiple times
      for (let i = 0; i < 10; i++) {
        await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      }
      
      expect(await gameScoreNFT.balanceOf(user1.address, 10)).to.equal(10);
      expect(await gameScoreNFT.userTotalScore(user1.address)).to.equal(10);
      expect(await gameScoreNFT.totalMintedPerScore(10)).to.equal(10);
      
      const userScores = await gameScoreNFT.getUserScores(user1.address);
      expect(userScores.length).to.equal(10);
      expect(userScores.every(score => score === 10n)).to.be.true;
    });
  });

  describe("Events", function () {
    it("Should emit ScoreNFTMinted event with correct parameters", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      await expect(gameScoreNFT.connect(user1).mintGameScoreNFT(12))
        .to.emit(gameScoreNFT, "ScoreNFTMinted")
        .withArgs(user1.address, 12, 1);
    });

    it("Should emit multiple events for multiple mints", async function () {
      const { gameScoreNFT, user1 } = await loadFixture(deployGameScoreNFTFixture);
      
      const tx1 = gameScoreNFT.connect(user1).mintGameScoreNFT(5);
      await expect(tx1)
        .to.emit(gameScoreNFT, "ScoreNFTMinted")
        .withArgs(user1.address, 5, 1);
      
      const tx2 = gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await expect(tx2)
        .to.emit(gameScoreNFT, "ScoreNFTMinted")
        .withArgs(user1.address, 10, 1);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complex scenario with multiple users and scores", async function () {
      const { gameScoreNFT, user1, user2, user3 } = await loadFixture(deployGameScoreNFTFixture);
      
      // Complex minting pattern
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user1).mintGameScoreNFT(5); // duplicate
      
      await gameScoreNFT.connect(user2).mintGameScoreNFT(10);
      await gameScoreNFT.connect(user2).mintGameScoreNFT(15);
      await gameScoreNFT.connect(user2).mintGameScoreNFT(20);
      
      await gameScoreNFT.connect(user3).mintGameScoreNFT(25);
      await gameScoreNFT.connect(user3).mintGameScoreNFT(1);
      
      // Verify total minted per score
      expect(await gameScoreNFT.totalMintedPerScore(5)).to.equal(2);
      expect(await gameScoreNFT.totalMintedPerScore(10)).to.equal(2);
      expect(await gameScoreNFT.totalMintedPerScore(15)).to.equal(1);
      expect(await gameScoreNFT.totalMintedPerScore(20)).to.equal(1);
      expect(await gameScoreNFT.totalMintedPerScore(25)).to.equal(1);
      expect(await gameScoreNFT.totalMintedPerScore(1)).to.equal(1);
      
      // Verify user total scores
      expect(await gameScoreNFT.userTotalScore(user1.address)).to.equal(3);
      expect(await gameScoreNFT.userTotalScore(user2.address)).to.equal(3);
      expect(await gameScoreNFT.userTotalScore(user3.address)).to.equal(2);
      
      // Verify all users are recorded
      const [users, totalCounts, scores] = await gameScoreNFT.getAllUserDetails();
      expect(users.length).to.equal(3);
      expect(totalCounts).to.deep.equal([3n, 3n, 2n]);
    });
  });
});