# DT Token Contract Deployment Instructions

## Current Issue
The snake game NFT system is not working because the DT token contract (`Dtoken.sol`) has not been deployed to the blockchain yet. The GameScoreNFT contract is deployed, but the DT token contract that handles game costs is missing.

## What's Working
✅ GameScoreNFT contract deployed at: `0xA4Ed3766BcE57eD54D13B94560a7eEDd2969cfF8`  
✅ Snake game can be played (temporarily free)  
✅ NFT claiming system is functional  
✅ NFT marketplace can mint NFTs  

## What's Missing
❌ DT token contract not deployed  
❌ Game cost system not functional  
❌ Token balance checking not working  

## How to Deploy DT Token Contract

### 1. Navigate to Smart Contracts Directory
```bash
cd smart-contracts
```

### 2. Install Dependencies (if not already done)
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the `smart-contracts` directory:
```env
PRIVATE_KEY=your_wallet_private_key_here
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

### 4. Deploy DT Token Contract
```bash
npx hardhat ignition deploy ignition/modules/Dtoken.js --network fuji
```

### 5. Update Contract Addresses
After successful deployment, update the contract address in:
- `project/src/components/Snakes.tsx` (line ~35)
- `project/src/App.tsx` (line ~25)

Replace the placeholder address with the newly deployed contract address.

### 6. Re-enable DT Token System
Once the contract is deployed, revert the temporary changes in `Snakes.tsx`:

#### Uncomment the token requirement:
```typescript
// Change this line back:
const hasEnoughTokens = parseFloat(dtTokenBalance) >= GAME_COST_DT;

// Instead of:
const hasEnoughTokens = true;
```

#### Re-enable token spending:
```typescript
// Remove the early return and uncomment the original logic:
const spendTokenForGame = async (): Promise<boolean> => {
  if (!walletConnected) {
    toast.success(`Please connect your wallet first`, {
      duration: 3000,
    });
    return false;
  }

  if (!hasEnoughTokens) {
    toast.success(`You need ${GAME_COST_DT} DT token to play. Current balance: ${dtTokenBalance} DT`, {
      duration: 3000,
    });
    return false;
  }

  // ... rest of the original function
};
```

#### Update UI text:
```typescript
// Change back to:
<p className="text-gray-400 max-w-2xl mx-auto text-lg">
  Guide the mystical serpent through an ever-changing maze. Collect treasures, avoid obstacles, and achieve unique scores to claim exclusive NFTs.
  Each quest costs <span className="text-white font-semibold">1 DT token</span> — make your journey legendary!
</p>
```

## Complete NFT System Flow

### 1. User Plays Snake Game
- Game costs 1 DT token (after deployment)
- User must have sufficient DT tokens
- Token is deducted when game starts

### 2. User Achieves Score
- Score is recorded (1-25 points)
- Game over screen shows claim NFT button

### 3. User Claims NFT
- Clicks "Claim NFT" button
- Score is marked as claimed locally
- User is guided to marketplace

### 4. User Mints NFT
- Navigates to marketplace
- Sees claim NFT section with their score
- Clicks "Mint NFT" button
- Smart contract mints ERC-1155 NFT
- NFT is added to user's collection

## Testing the System

### 1. Test DT Token Purchase
```bash
# In smart contracts directory
npx hardhat console --network fuji
```

```javascript
// Get DT token contract
const Dtoken = await ethers.getContractFactory("Dtoken");
const dtToken = Dtoken.attach("DEPLOYED_CONTRACT_ADDRESS");

// Buy tokens (send ETH to get DT tokens)
await dtToken.buyToken({ value: ethers.parseEther("0.001") });

// Check balance
const balance = await dtToken.balanceOf("YOUR_WALLET_ADDRESS");
console.log("DT Token Balance:", ethers.formatEther(balance));
```

### 2. Test Game Cost
```javascript
// Try to play game (should deduct 1 DT token)
await dtToken.playGame();
```

### 3. Test NFT Minting
```javascript
// Get NFT contract
const GameScoreNFT = await ethers.getContractFactory("GameScoreNFT");
const nftContract = GameScoreNFT.attach("0xA4Ed3766BcE57eD54D13B94560a7eEDd2969cfF8");

// Mint NFT for score 10
await nftContract.mintGameScoreNFT(10);
```

## Troubleshooting

### Common Issues:
1. **"Not enough tokens to play"** - User needs to buy DT tokens first
2. **"Invalid score"** - Score must be between 1-25
3. **"Already owns NFT"** - User can only mint one NFT per unique score
4. **Transaction failed** - Check gas fees and network connection

### Network Configuration:
- **Testnet**: Avalanche Fuji (Chain ID: 43113)
- **Mainnet**: Avalanche C-Chain (Chain ID: 43114)

## Summary
The snake game NFT system is 95% complete. The only missing piece is the DT token contract deployment. Once deployed and integrated, users will be able to:

1. Buy DT tokens with ETH
2. Spend 1 DT token per game
3. Achieve scores and claim NFTs
4. Mint NFTs in the marketplace
5. View their NFT collection

The temporary free mode allows users to test the game and NFT claiming while the token system is being deployed. 