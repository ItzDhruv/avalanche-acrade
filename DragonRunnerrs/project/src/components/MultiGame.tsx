import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import GameComponent from "./GameComponent";
import NFTMarketplace from "./NFTMarketplace";
import Leaderboard from "./Leaderboard";
import SnakeGame from "./Snakes";
import WallBall from "./Wallball";
import CarRunnerGame from "./CarRunnerGame"; // 👈 new component
import LaunchSoon from "./LaunchSoon";
interface MultiGameProps {
  wallet: { address: string; balance: string; connected: boolean };
  dtTokenBalance: string;
  claimedScores: Set<number>;
  onClaimNFT: (score: number) => Promise<void>;
  onRefreshTokenBalance: () => Promise<void>;
}

// --- Home Page ---
function Home() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap gap-6 h-screen bg-black via-gray-800 to-black p-8">
       {/* --- Car Runner Game Card --- */}
      <GameCard
        title="Road Rivals"
        img="/car.jpg" // 👈 add logo in /public
        playPath="/carrunner"
        playIcon="🏎️"
        color="from-yellow-400 to-red-500"
        hover="hover:from-red-500 hover:to-yellow-400"
        navigate={navigate}
      />
      {/* --- Dragon Runner Card --- */}
      <GameCard
        title="Dragon Runner"
        img="/godzila.jpg"
        playPath="/dragonrunner"
        playIcon="🎮"
        color="from-blue-500 to-purple-600"
        hover="hover:from-purple-600 hover:to-blue-500"
        navigate={navigate}
      />

      {/* --- Snake Game Card --- */}
      <GameCard
        title="Snake Game"
        img="/snak.jpg"
        playPath="/snake"
        playIcon="🐍"
        color="from-emerald-500 to-teal-600"
        hover="hover:from-teal-600 hover:to-emerald-500"
        navigate={navigate}
      />

      {/* --- WallBall Game Card --- */}
      <GameCard
        title="Wall Ball"
        img="/walball.jpg"
        playPath="/wallball"
        playIcon="🏐"
        color="from-orange-500 to-red-600"
        hover="hover:from-red-600 hover:to-orange-500"
        navigate={navigate}
      />
           <GameCard
        title="Land Mining"
        img="/land.png"
        playPath="/LaunchSoon"
        playIcon="🏐"
        color="from-orange-500 to-red-600"
        hover="hover:from-red-600 hover:to-orange-500"
        navigate={navigate}
      />
           <GameCard
        title="Pool Ball"
        img="/pool.jpg"
        playPath="/LaunchSoon"
        playIcon="🏐"
        color="from-orange-500 to-red-600"
        hover="hover:from-red-600 hover:to-orange-500"
        navigate={navigate}
      />

      <GameCard
        title="Carrom"
        img="/carrom.jpg"
        playPath="/LaunchSoon"
        playIcon="🏐"
        color="from-orange-500 to-red-600"
        hover="hover:from-red-600 hover:to-orange-500"
        navigate={navigate}
      />

       <GameCard
        title="Chess"
        img="/chess.jpg"
        playPath="/LaunchSoon"
        playIcon="🏐"
        color="from-orange-500 to-red-600"
        hover="hover:from-red-600 hover:to-orange-500"
        navigate={navigate}
      />
       
      
     
    </div>
  );
}

// --- Reusable Card Component ---
function GameCard({
  title,
  img,
  playPath,
  playIcon,
  color,
  hover,
  navigate,
}: {
  title: string;
  img: string;
  playPath: string;
  playIcon: string;
  color: string;
  hover: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div
      className="w-[300px] h-[360px] rounded-2xl shadow-xl 
        border border-gray-700 bg-gray-900/70 backdrop-blur-xl 
        flex flex-col items-center justify-between p-6 
        transition hover:scale-105"
    >
      <img
        src={img}
        alt={`${title} Logo`}
        className="w-20 h-20 object-contain drop-shadow-md"
      />
      <h1 className="text-2xl font-bold text-white tracking-wide text-center">
        {title}
      </h1>

      <button
        onClick={() => navigate(playPath)}
        className={`px-5 py-2 w-full text-base font-semibold 
          rounded-lg bg-gradient-to-r ${color} 
          text-white shadow-md ${hover} 
          transition-all duration-300`}
      >
        Play {playIcon}
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
  );
}

// --- Router Wrapper ---
export default function MultiGame({ 
  wallet, 
  dtTokenBalance, 
  claimedScores, 
  onClaimNFT, 
  onRefreshTokenBalance 
}: MultiGameProps) {
  const [latestClaimedScore, setLatestClaimedScore] = useState<number>(0);

  const handleClaimNFT = (score: number) => {
    if (score > 0 && !claimedScores.has(score)) {
      onClaimNFT(score);
      setLatestClaimedScore(score);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Dragon Runner */}
        <Route
          path="/dragonrunner"
          element={
            <GameComponent
              onScore={(s: number) => console.log("Score:", s)}
              onClaimNFT={handleClaimNFT}
              claimedScores={claimedScores}
              walletConnected={wallet.connected}
              dtTokenBalance={dtTokenBalance}
              onRefreshTokenBalance={onRefreshTokenBalance}
            />
          }
        />

        {/* Snake Game */}
        <Route
          path="/snake"
          element={
            <SnakeGame
              onScore={(s: number) => console.log("Score:", s)}
              onClaimNFT={handleClaimNFT}
              claimedScores={claimedScores}
              walletConnected={wallet.connected}
              dtTokenBalance={dtTokenBalance}
              onRefreshTokenBalance={onRefreshTokenBalance}
            />
          }
        />

        {/* WallBall Game */}
        <Route
          path="/wallball"
          element={
            <WallBall
              onScore={(s: number) => console.log("Score:", s)}
              onClaimNFT={handleClaimNFT}
              claimedScores={claimedScores}
              walletConnected={wallet.connected}
              dtTokenBalance={dtTokenBalance}
              onRefreshTokenBalance={onRefreshTokenBalance}
            />
          }
        />
        <Route path="/LaunchSoon" element={<LaunchSoon/>}></Route>

        {/* Car Runner Game */}
        <Route
          path="/carrunner"
          element={
            <CarRunnerGame
              onScore={(s: number) => console.log("Score:", s)}
              onClaimNFT={handleClaimNFT}
              claimedScores={claimedScores}
              walletConnected={wallet.connected}
              dtTokenBalance={dtTokenBalance}
              onRefreshTokenBalance={onRefreshTokenBalance}
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
              scoreToMint={latestClaimedScore}
              onClaimComplete={() => setLatestClaimedScore(0)}
            />
          }
        />

        {/* Leaderboard */}
        <Route
          path="/leaderboard"
          element={<Leaderboard />}
        />
      </Routes>
    </BrowserRouter>
  );
}
