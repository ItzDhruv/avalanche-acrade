import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import GameComponent from "./GameComponent";
import NFTMarketplace from "./NFTMarketplace";
import Leaderboard from "./Leaderboard";
import SnakeGame from "./Snakes"; // 👈 Ensure file name matches (Snakes.tsx)

interface MultiGameProps {
  wallet: { address: string; balance: string; connected: boolean };
  dtTokenBalance: string;
}

// --- Home Page ---
function Home() {
  const navigate = useNavigate();
  return (
    <div className="flex items-start gap-6 h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      {/* --- Dragon Runner Card --- */}
      <div
        className="w-[300px] h-[360px] rounded-2xl shadow-xl 
        border border-gray-700 bg-gray-900/70 backdrop-blur-xl 
        flex flex-col items-center justify-between p-6 
        transition hover:scale-105 hover:shadow-blue-500/30"
      >
        <img
          src="/dragonlogo1.jpg"
          alt="Dragon Runner Logo"
          className="w-20 h-20 object-contain drop-shadow-md"
        />
        <h1 className="text-2xl font-bold text-white tracking-wide text-center">
          Dragon Runner
        </h1>

        <button
          onClick={() => navigate("/dragonrunner")}
          className="px-5 py-2 w-full text-base font-semibold 
            rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 
            text-white shadow-md hover:from-purple-600 hover:to-blue-500 
            transition-all duration-300"
        >
          Play 🎮
        </button>

        <div className="flex gap-2 w-full">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex-1 px-3 py-2 rounded-md text-xs font-medium 
              border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
          >
            Marketplace
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="flex-1 px-3 py-2 rounded-md text-xs font-medium 
              border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* --- Snake Game Card --- */}
      <div
        className="w-[300px] h-[360px] rounded-2xl shadow-xl 
        border border-gray-700 bg-gray-900/70 backdrop-blur-xl 
        flex flex-col items-center justify-between p-6 
        transition hover:scale-105 hover:shadow-green-500/30"
      >
        <img
          src="/snak.jpg" // 👈 Use a different logo if you have one
          alt="Snake Game Logo"
          className="w-20 h-20 object-contain drop-shadow-md"
        />
        <h1 className="text-2xl font-bold text-white tracking-wide text-center">
          Snake Game
        </h1>

        <button
          onClick={() => navigate("/snake")}
          className="px-5 py-2 w-full text-base font-semibold 
            rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 
            text-white shadow-md hover:from-teal-600 hover:to-emerald-500 
            transition-all duration-300"
        >
          Play 🐍
        </button>

        <div className="flex gap-2 w-full">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex-1 px-3 py-2 rounded-md text-xs font-medium 
              border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
          >
            Marketplace
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="flex-1 px-3 py-2 rounded-md text-xs font-medium 
              border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Router Wrapper ---
export default function MultiGame({ wallet, dtTokenBalance }: MultiGameProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Dragon Runner Route */}
        <Route
          path="/dragonrunner"
          element={
            <GameComponent
              onScore={(s: number) => console.log("Score:", s)}
              onClaimNFT={(s: number) => console.log("Claim NFT for:", s)}
              claimedScores={new Set()}
              walletConnected={wallet.connected}
              dtTokenBalance={dtTokenBalance}
              onRefreshTokenBalance={() => {}}
            />
          }
        />

        {/* Snake Game Route (clean like Dragon Runner) */}
       

               <Route
          path="/snake"
          element={
            <SnakeGame 
              onScore={(s: number) => console.log("Score:", s)}
              onClaimNFT={(s: number) => console.log("Claim NFT for:", s)}
              claimedScores={new Set()}
              walletConnected={wallet.connected}
              dtTokenBalance={dtTokenBalance}
              onRefreshTokenBalance={() => {}}
            />
          }
        />

        {/* NFT Marketplace */}
        <Route
          path="/marketplace"
          element={
            <NFTMarketplace
              walletAddress={wallet.address}
              walletConnected={wallet.connected}
              scoreToMint={0}
              onClaimComplete={() => {}}
            />
          }
        />

        {/* Leaderboard */}
        <Route
          path="/leaderboard"
          element={<Leaderboard claimedScores={new Set()} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
