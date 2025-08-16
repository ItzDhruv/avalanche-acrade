# 🐉 DragonNFT

DragonNFT is the NFT rewards system for the **DragonRunner** Web3 arcade game.  
Players earn unique NFT collectibles by achieving high scores, winning seasonal events, or completing special challenges.  
These NFTs serve as proof of skill, unlock in-game perks, and can be traded on any NFT marketplace.

---

## 🎯 Features

- **Dynamic NFT Minting**  
  Mint NFTs directly from the game when a player reaches specific milestones or scores.

- **Score-Linked Rarity**  
  NFT rarity depends on the score achieved (Common, Rare, Legendary).

- **On-Chain Proof of Achievement**  
  Each NFT stores metadata with the player’s score, mint date, and rarity.

- **Tradable & Interoperable**  
  Compatible with ERC-1155 NFT standard for trading across marketplaces.

- **Anti-Duplicate Claim System**  
  Prevents the same score from minting multiple NFTs for the same player.

---

## 🛠 Tech Stack

- **Blockchain:** Ethereum / Polygon (EVM Compatible)  
- **Smart Contracts:** Solidity + OpenZeppelin ERC1155  
- **Game Integration:** React frontend with Web3.js / Ethers.js  
- **Storage:** IPFS for metadata & images

---

## 📜 Smart Contract Overview

The DragonNFT contract:
- Mints NFTs based on player score.
- Tracks total supply per score tier.
- Supports metadata URIs for different rarities.
- Owner can update metadata base URI if needed.

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/itzDhruv/DragonNFT.git
cd DragonNFT
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Compile & Deploy Contracts
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network 
```

### 4️⃣ Update Game Frontend
- Add the deployed contract address and ABI to the game’s frontend integration.

---

## 🎮 How it Works In-Game
1. Player finishes a DragonRunner game session.  
2. Game sends the score to the smart contract.  
3. If eligible, the contract mints an NFT with the rarity linked to that score.  
4. NFT is sent to the player’s connected wallet.

---

## 📂 Project Structure

```
DragonNFT/
│
├── contracts/        # Solidity smart contracts
├── scripts/          # Deployment and interaction scripts
├── metadata/         # Sample NFT metadata JSON files
├── test/             # Hardhat tests
└── frontend/         # React game integration
```

---

## 🧪 Testing
```bash
npx hardhat test
```

---

## 🔮 Future Plans
- Add **seasonal limited-edition NFTs**.  
- Integrate **leaderboard-based NFT rewards**.  
- Enable **NFT staking** for in-game boosts.

---

## 📄 License
MIT License — feel free to fork and modify, but attribution is appreciated.

---

## 🤝 Contributing
Pull requests are welcome!  
For major changes, open an issue first to discuss what you’d like to change.

---

## 📬 Contact
**Developer:** Dhruv Dobariya  
**Email:** dhruvdobariya897@gmail.com  
**Location:** Surat, Gujarat, India
