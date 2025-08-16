import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Trophy, Medal, Award, Crown, TrendingUp, Calendar, User, Star, Zap } from "lucide-react";

const GAME_SCORE_NFT_CONTRACT = "0xA4Ed3766BcE57eD54D13B94560a7eEDd2969cfF8";

interface LeaderEntry {
  rank: number;
  owner: string;
  uniqueScores: number;
  totalNFTs: number;
  scoresList: number[];
  isCurrentUser: boolean;
}

const Leaderboard: React.FC = () => {
  const [sortBy, setSortBy] = useState<"totalNFTs" | "uniqueScores">("totalNFTs");
  const [leaderboardData, setLeaderboardData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserAddress, setCurrentUserAddress] = useState<string>("");

  // Get current user address
  const getCurrentUser = async () => {
    try {
      if ((window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setCurrentUserAddress(address.toLowerCase());
      }
    } catch (err) {
      console.log("No wallet connected");
    }
  };

  // Fetch from smart contract
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(
        GAME_SCORE_NFT_CONTRACT,
        [
          "function getAllUserDetails() external view returns (address[] memory users, uint256[] memory totalCounts, uint256[][] memory scores)"
        ],
        provider
      );

      const [users, totalCounts, scoresList] = await contract.getAllUserDetails();

      const entries: LeaderEntry[] = [];

      for (let i = 0; i < users.length; i++) {
        const addr = users[i];
        const totalNFTs = Number(totalCounts[i]);
        const userScores = scoresList[i].map((s: ethers.BigNumberish) => Number(s));
        const uniqueScores = new Set(userScores).size;

        entries.push({
          rank: 0,
          owner: addr,
          uniqueScores: uniqueScores,
          totalNFTs: totalNFTs,
          scoresList: userScores,
          isCurrentUser: addr.toLowerCase() === currentUserAddress
        });
      }

      // Sort based on selected criteria
      const sorted = [...entries].sort((a, b) => {
        if (sortBy === "totalNFTs") {
          return b.totalNFTs - a.totalNFTs;
        } else {
          return b.uniqueScores - a.uniqueScores;
        }
      });

      // Assign ranks
      sorted.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      setLeaderboardData(sorted);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserAddress) {
      fetchLeaderboard();
    }
  }, [sortBy, currentUserAddress]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-8 w-8 text-white drop-shadow-lg" />;
      case 2:
        return <Medal className="h-7 w-7 text-gray-300 drop-shadow-lg" />;
      case 3:
        return <Award className="h-6 w-6 text-gray-400 drop-shadow-lg" />;
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-gray-600">
            <span className="text-white font-bold text-sm">#{rank}</span>
          </div>
        );
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankBackground = (rank: number, isCurrentUser: boolean) => {
    let baseClasses = "transition-all duration-300 hover:scale-[1.02] border";
    
    if (isCurrentUser) {
      baseClasses += " ring-2 ring-white ring-opacity-50 bg-gradient-to-r from-gray-800 to-gray-700 border-white border-opacity-30";
    } else {
      switch (rank) {
        case 1:
          baseClasses += " bg-gradient-to-r from-gray-900 to-black border-gray-600 shadow-xl";
          break;
        case 2:
          baseClasses += " bg-gradient-to-r from-gray-800 to-gray-900 border-gray-500";
          break;
        case 3:
          baseClasses += " bg-gradient-to-r from-gray-700 to-gray-800 border-gray-500";
          break;
        default:
          baseClasses += " bg-gradient-to-r from-gray-800 to-gray-900 border-gray-600 hover:border-gray-500";
      }
    }
    
    return baseClasses;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
             
              <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent leading-normal">
     LeaderBoard
    </h2>
            </div>
        
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between mb-8">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <span className="text-gray-300 font-medium">Sort by:</span>
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => setSortBy("totalNFTs")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  sortBy === "totalNFTs"
                    ? "bg-white text-black shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Total NFTs</span>
              </button>
              <button
                onClick={() => setSortBy("uniqueScores")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  sortBy === "uniqueScores"
                    ? "bg-white text-black shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Star className="h-4 w-4" />
                <span>Unique Scores</span>
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            {leaderboardData.length} players competing
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          {leaderboardData.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No players yet</h3>
              <p className="text-gray-500">Be the first to mint an NFT and claim your spot!</p>
            </div>
          ) : (
            leaderboardData.map((entry, index) => (
              <div
                key={entry.owner}
                className={`rounded-xl p-6 ${getRankBackground(entry.rank, entry.isCurrentUser)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-16">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold">
                          {entry.rank}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-mono text-gray-300">
                            {formatAddress(entry.owner)}
                          </span>
                          {entry.isCurrentUser && (
                            <span className="px-2 py-1 bg-white text-black text-xs font-bold rounded-full">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-300">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4" />
                          <span>Unique Scores: <span className="font-semibold text-white">{entry.uniqueScores}</span></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <span>Total NFTs: <span className="font-semibold text-white">{entry.totalNFTs}</span></span>
                        </div>
                      </div>
                      
                      {/* Scores List */}
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.scoresList.slice(0, 20).map((score, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600"
                            >
                              {score}
                            </span>
                          ))}
                          {entry.scoresList.length > 20 && (
                            <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                              +{entry.scoresList.length - 20} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;