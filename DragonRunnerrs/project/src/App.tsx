import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import GameComponent from "./components/GameComponent";
import NFTMarketplace from "./components/NFTMarketplace";
import Leaderboard from "./components/Leaderboard";
import Header from "./components/Header";
import DtokenAbi from "./ContractAbi/Dtoken.json";
import toast, { Toaster } from "react-hot-toast";
import MultiGame from "./components/MultiGame";
interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
}

const DT_CONTRACT_ABI = DtokenAbi as any;
const DT_CONTRACT_ADDRESS = "0x079Fe31EE22088a6B9cB2615D8e6AB9DFb3A75a5";

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [currentView, setCurrentView] = useState<"game" | "marketplace" | "leaderboard">("game");
  const [wallet, setWallet] = useState<WalletInfo>({
    address: "",
    balance: "0",
    connected: false,
  });
  const [gameScore, setGameScore] = useState<number>(0);
  const [claimedScores, setClaimedScores] = useState<Set<number>>(new Set());
  const [dtTokenBalance, setDtTokenBalance] = useState<string>("0");

  // Helper: return highest claimed score or 0 when none
  const latestClaimedScore = (): number => {
    if (claimedScores.size === 0) return 0;
    return Math.max(...Array.from(claimedScores));
  };

  // Function to fetch Dragon Token balance
  const fetchDTBalance = async (address: string) => {
    try {
      if (!window.ethereum || !address) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      // Use provider for reading; signer is not necessary to read balances
      const contract = new ethers.Contract(DT_CONTRACT_ADDRESS, DT_CONTRACT_ABI, provider);

      const balance = await contract.balanceOf(address);
      const decimals = (await contract.decimals?.()) ?? 18;
      const formattedBalance = ethers.formatUnits(balance, decimals);

      setDtTokenBalance(String(formattedBalance));
      console.log(`DT Token Balance: ${formattedBalance}`);
    } catch (error) {
      console.error("Error fetching DT balance:", error);
      setDtTokenBalance("0");
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask to connect your wallet");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balanceBigInt = await provider.getBalance(address);

      setWallet({
        address,
        balance: ethers.formatEther(balanceBigInt),
        connected: true,
      });

      // fetch token balance
      await fetchDTBalance(address);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const disconnectWallet = () => {
    setWallet({
      address: "",
      balance: "0",
      connected: false,
    });
    setDtTokenBalance("0");
  };

  const handleGameScore = (score: number) => {
    setGameScore(score);
  };

  // Claim NFT locally (GameComponent calls this when it successfully mints)
  const claimNFT = async (score: number) => {
    console.log('App.tsx claimNFT called with score:', score);
    console.log('Current claimedScores:', Array.from(claimedScores));
    
    if (!wallet.connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (claimedScores.has(score)) {
      alert("This score has already been claimed!");
      return;
    }

    // Add to claimed set (UI only — actual minting happens inside marketplace or GameComponent if wired)
    setClaimedScores((prev) => {
      const newSet = new Set(prev).add(score);
      console.log('Updated claimedScores:', Array.from(newSet));
      return newSet;
    });

    toast.success(`NFT claimed for score ${score}!`, {
      duration: 3000,
    });
  };

  const refreshTokenBalance = async () => {
    if (wallet.connected && wallet.address) {
      await fetchDTBalance(wallet.address);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        // update wallet address & balances
        (async () => {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = provider.getSigner();
          const address = accounts[0];
          try {
            const balance = await provider.getBalance(address);
            setWallet({
              address,
              balance: ethers.formatEther(balance),
              connected: true,
            });
            await fetchDTBalance(address);
          } catch (err) {
            console.error("accountsChanged handler error:", err);
          }
        })();
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      try {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      } catch {}
    };
  }, []);

  // Auto-refresh token balance every 30 seconds when wallet is connected
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (wallet.connected && wallet.address) {
      interval = setInterval(() => {
        fetchDTBalance(wallet.address);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [wallet.connected, wallet.address]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#333",
            color: "#fff",
          },
        }}
      />

      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        wallet={wallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        dtTokenBalance={dtTokenBalance}
        onRefreshTokenBalance={refreshTokenBalance}
      />

      <main className="container mx-auto px-4 py-8">
        {currentView === "game" && (
          <MultiGame 
            wallet={wallet} 
            dtTokenBalance={dtTokenBalance}
            claimedScores={claimedScores}
            onClaimNFT={claimNFT}
            onRefreshTokenBalance={refreshTokenBalance}
          />
        )}

        {currentView === "marketplace" && (
          <NFTMarketplace
            walletAddress={wallet.address}
            walletConnected={wallet.connected}
            scoreToMint={latestClaimedScore()} // pass a single number or 0
            onClaimComplete={() => {
              // when marketplace reports a claim completed, refresh claimedScores UI if needed
              // optional: you might want to remove the score from claimedScores or mark it as minted
              refreshTokenBalance();
            }}
          />
        )}

        {currentView === "leaderboard" && <Leaderboard />}
      </main>

      <footer className="border-t border-gray-800 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 DragonNFT. A blockchain-powered endless runner experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
