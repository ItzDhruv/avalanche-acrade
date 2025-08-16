// components/Header.tsx
import React, { useState, useEffect } from 'react';
import { Square as GameSquare, Trophy, Coins, Plus, X } from 'lucide-react';
import WalletConnect from './WalletConnect';
import { ethers } from 'ethers';
import DtokenAbi from "../ContractAbi/Dtoken.json";
import toast from 'react-hot-toast';

interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
}

interface HeaderProps {
  currentView: 'game' | 'marketplace' | 'leaderboard';
  setCurrentView: (view: 'game' | 'marketplace' | 'leaderboard') => void;
  wallet: WalletInfo;
  onConnect: () => void;
  onDisconnect: () => void;
  dtTokenBalance: string;
  onRefreshTokenBalance: () => void;
}

const DT_CONTRACT_ABI = DtokenAbi;

// Replace with your actual Dragon Token contract address
const DT_CONTRACT_ADDRESS = "0x079Fe31EE22088a6B9cB2615D8e6AB9DFb3A75a5";

// Token price from smart contract: 0.0002 ETH per token
const TOKEN_PRICE_ETH = "0.0002";

const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  wallet,
  onConnect,
  onDisconnect,
  dtTokenBalance,
  onRefreshTokenBalance
}) => {
  const [showBuyPopup, setShowBuyPopup] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState('0');

  // Calculate estimated tokens based on ETH amount
  useEffect(() => {
    if (buyAmount && !isNaN(parseFloat(buyAmount))) {
      const ethAmount = parseFloat(buyAmount);
      const tokenPrice = parseFloat(TOKEN_PRICE_ETH);
      const tokens = ethAmount / tokenPrice;
      setEstimatedTokens(tokens.toFixed(2));
    } else {
      setEstimatedTokens('0');
    }
  }, [buyAmount]);

  const handleBuyDT = async () => {
    if (!wallet.connected) {
      
       toast.success(`Please connect your wallet first`, {
  duration: 3000,
});
      return;
    }

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.success(`Eneter valid amount`, {
  duration: 3000,
});
      return;
    }

    setIsLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance
      const contract = new ethers.Contract(DT_CONTRACT_ADDRESS, DT_CONTRACT_ABI, signer);

      // Convert ETH amount to Wei
      const ethValue = ethers.parseEther(buyAmount);

      // Call the buyToken function from your smart contract
      const tx = await contract.buyToken({ 
        value: ethValue,
        gasLimit: 200000 // Add gas limit to prevent out of gas errors
      });

      // Wait for transaction confirmation
      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Parse the BuyToken event to get exact token amount purchased
      const buyTokenEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === 'ButToken';
        } catch (error) {
          return false;
        }
      });

      let tokensReceived = estimatedTokens;
      if (buyTokenEvent) {
        const parsed = contract.interface.parseLog(buyTokenEvent);
        console.log("parsed",parsed)
        tokensReceived = ethers.formatUnits(parsed.args[1],0);
        console.log("tokensReceived",tokensReceived)
      }

      
      toast.success(`Successfully purchased ${tokensReceived} Dragon Tokens`, {
  duration: 5000,
});

      setShowBuyPopup(false);
      setBuyAmount('');
      
      // Refresh token balance after successful purchase
      setTimeout(() => {
        onRefreshTokenBalance();
      }, 1000); // Small delay to ensure blockchain state is updated

    } catch (error: any) {
      console.error('Error buying DT tokens:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to purchase tokens. Please try again.';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = 'Transaction cancelled by user.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance for this transaction.';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Transaction failed. Please check your ETH amount and try again.';
      }
      
     toast.success(`${errorMessage}`, {
  duration: 3000,
});
    } finally {
      setIsLoading(false);
    }
  };

  const formatTokenBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  const formatEthAmount = (amount: string): string => {
    if (!amount || isNaN(parseFloat(amount))) return '0.0000';
    return parseFloat(amount).toFixed(4);
  };

  return (
    <>
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/dragonlogo.jpg" alt="Dragon Logo" className="h-8 w-8 rounded" />
              <h1 className="text-2xl font-bold">Avalanche arcade</h1>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setCurrentView('game')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentView === 'game' ? 'bg-white text-black' : 'hover:bg-gray-800'
                }`}
              >
                
                <span>Game</span>
              </button>
              <button
                onClick={() => setCurrentView('marketplace')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentView === 'marketplace' ? 'bg-white text-black' : 'hover:bg-gray-800'
                }`}
              >
              
                <span>Marketplace</span>
              </button>
              <button
                onClick={() => setCurrentView('leaderboard')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentView === 'leaderboard' ? 'bg-white text-black' : 'hover:bg-gray-800'
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Leaderboard</span>
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Dragon Token Balance */}
              {wallet.connected && (
                <button
                  onClick={() => setShowBuyPopup(true)}
                  className="group relative flex items-center justify-center hover:bg-white hover:text-black px-3 py-2 border border-white rounded-lg bg-transparent transition-all duration-200 w-[120px] h-[40px]"
                >
                  {/* Default: Token Balance + Icon */}
                  <div className="flex items-center space-x-2 group-hover:opacity-0 transition-opacity duration-200">
                    <span className="text-white font-medium">
                      {formatTokenBalance(dtTokenBalance)} DT
                    </span>
                    <Plus className="h-4 w-4 text-white" />
                  </div>

                  {/* Hover: Buy Text */}
                  <span className="absolute font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Buy DT
                  </span>
                </button>
              )}

              <WalletConnect
                wallet={wallet}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b border-gray-800">
        <div className="flex">
          <button
            onClick={() => setCurrentView('game')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-all ${
              currentView === 'game' ? 'bg-white text-black' : 'hover:bg-gray-800'
            }`}
          >
            <GameSquare className="h-4 w-4" />
            <span>Game</span>
          </button>
          <button
            onClick={() => setCurrentView('marketplace')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-all ${
              currentView === 'marketplace' ? 'bg-white text-black' : 'hover:bg-gray-800'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>NFTs</span>
          </button>
          <button
            onClick={() => setCurrentView('leaderboard')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-all ${
              currentView === 'leaderboard' ? 'bg-white text-black' : 'hover:bg-gray-800'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Leaders</span>
          </button>
        </div>

        {/* Mobile Token Balance */}
        {wallet.connected && (
          <div className="px-4 py-2 border-t border-gray-800">
            <button
              onClick={() => setShowBuyPopup(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-white rounded-lg hover:bg-white hover:text-black transition-all"
            >
              <span className="text-white font-medium">
                {formatTokenBalance(dtTokenBalance)} DT
              </span>
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Buy DT Token Popup */}
      {showBuyPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg border border-gray-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Buy Dragon Tokens</h2>
              <button
                onClick={() => setShowBuyPopup(false)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Balance
                </label>
                <div className="px-3 py-2 bg-gray-800 rounded-lg text-white">
                  {formatTokenBalance(dtTokenBalance)} DT
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (Avax)
                </label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder="0.001"
                  step="0.0001"
                  min="0"
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white disabled:opacity-50"
                />
              </div>

              <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg">
                <p className="mb-1">
                  <strong>Token Price:</strong> {TOKEN_PRICE_ETH} Avax per DT
                </p>
                <p className="mb-1">
                  <strong>You will pay:</strong> {formatEthAmount(buyAmount)} Avax
                </p>
                {buyAmount && (
                  <p className="text-green-400">
                    <strong>You will receive:</strong> ~{estimatedTokens} DT
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBuyPopup(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuyDT}
                  disabled={isLoading || !buyAmount || parseFloat(buyAmount) <= 0}
                  className="flex-1 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Buy DT'}
                </button>
              </div>

              {isLoading && (
                <div className="text-center text-sm text-gray-400">
                  <p>Please confirm the transaction in your wallet...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;