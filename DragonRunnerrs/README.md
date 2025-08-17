# 🎮 Avalanche Arcade  

Avalanche Arcade is a **Web3 gaming hub** where players can enjoy multiple arcade-style games, earn rewards, and trade in-game assets.  
The platform uses **AVAX** and **DT (Arcade Token)** for gameplay, rewards, and marketplace interactions.  
Each game supports **NFT-based collectibles** powered by an **ERC-1155 smart contract**, along with a **DT ERC-20 token** for in-game economy.  

---

## 🚀 Games Available

- 🐉 **Dragon Runner** – Endless runner game with NFT rewards.  
- 🏎 **Road Rivals** – High-speed car racing with leaderboards.  
- 🐍 **Snake Game** – Classic snake reimagined with blockchain rewards.  
- 🏐 **Wall Ball** – Reflex and timing challenge game.  

Each game is integrated with **Marketplace**, **Leaderboard**, and **Play-to-Earn rewards**.

---

## 🎯 Features

- **DT Token Economy**  
  Players use DT tokens to play, upgrade, and trade. DT can be bought with AVAX.  

- **NFT Game Assets (ERC-1155)**  
  Each game has unique NFT rewards (skins, boosts, limited editions).  

- **On-Chain Leaderboards**  
  High scores are recorded on-chain for transparency and seasonal competitions.  

- **Marketplace**  
  Buy, sell, or trade NFT collectibles and power-ups using DT tokens.  

- **Secure Smart Contracts**  
  Two-contract system:  
  - `DToken` (ERC-20) – Arcade Token for gameplay and marketplace.  
  - `GameAssets` (ERC-1155) – NFT assets and rewards.  

---

## 🛠 Tech Stack

- **Blockchain:** Avalanche (C-Chain, EVM Compatible)  
- **Smart Contracts:** Solidity + OpenZeppelin (ERC-20 + ERC-1155)  
- **Frontend:** React + Tailwind + TypeScript  
- **Game Engine:** HTML5/Canvas, React Components  
- **Integration:** Ethers.js + WalletConnect + MetaMask  
- **Storage:** IPFS for NFT metadata  

---

## 📜 Smart Contract Overview

### 1️⃣ DT Token (ERC-20)
- Minted when players buy with AVAX.  
- Used for gameplay entry fees, marketplace trades, and rewards.  
- Example functions:  
  - `buyDT()` – Swap AVAX → DT  
  - `redeemDT()` – Convert DT back to AVAX  
  - `balanceOf(address)` – Check balance  

### 2️⃣ Game Assets (ERC-1155)
- NFT assets linked to each game.  
- Unique IDs for games:  
  - `1` → Dragon Runner  
  - `2` → Road Rivals  
  - `3` → Snake Game  
  - `4` → Wall Ball  
- Example functions:  
  - `mintAsset(address, id, amount)`  
  - `burnAsset(address, id, amount)`  
  - `marketplaceBuy(uint256 id, uint256 priceInDT)`  

---

## 📂 Project Structure

```

AvalancheArcade/
│
├── contracts/        # Solidity smart contracts
│   ├── DToken.sol    # ERC-20 Arcade Token
│   └── GameAssets.sol# ERC-1155 NFT contract
│
├── frontend/         # React + Tailwind arcade interface
│   ├── components/   # UI + Game modules
│   ├── games/        # Game implementations
│   └── config/       # Contract addresses & ABI
│
├── scripts/          # Hardhat deployment scripts
├── metadata/         # NFT metadata JSON files
├── test/             # Smart contract tests
└── README.md

````

---

## ⚡ Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/itzDhruv/AvalancheArcade.git
cd AvalancheArcade
````

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Compile & Deploy Contracts

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network fuji
```

### 4️⃣ Update Frontend Config

Add the deployed contract addresses into:

```ts
// frontend/config/contracts.ts
export const DTOKEN_ADDRESS = "0x123...abc";
export const GAMEASSETS_ADDRESS = "0x456...def";
```

---

## 🎮 How It Works In-Game

1. Player connects wallet.
2. Player buys DT tokens with AVAX.
3. Player chooses a game (Dragon Runner, Road Rivals, Snake, Wall Ball).
4. Entry fee (DT) is deducted → gameplay starts.
5. Based on score/performance, rewards are distributed:

   * DT tokens
   * NFT rewards (ERC-1155)
6. Leaderboard updates score.
7. NFTs & tokens can be traded in Marketplace.

---

## 🧪 Testing

```bash
npx hardhat test
```

---

## 🔮 Future Plans

* Seasonal tournaments with unique NFT rewards.
* Mobile app version.
* Cross-chain support (Ethereum, Polygon).
* NFT staking for in-game perks.

---

## 📄 License

MIT License — feel free to fork and build upon this project.

---

## 👨‍💻 Developer

**Dhruv Dobariya**
📧 Email: [dhruvdobariya897@gmail.com](mailto:dhruvdobariya897@gmail.com)
📍 Surat, Gujarat, India

**Rakesh kumawat**
 📧 Email: rakeshkumawatrrkk128777@gmail.com 
 📍 Mumbai, Maharashtra, India

**Aniket Raikar** 
 📧 Email: aniketraikar82@gmail.com 
📍 Mumbai, Maharashtra, India
