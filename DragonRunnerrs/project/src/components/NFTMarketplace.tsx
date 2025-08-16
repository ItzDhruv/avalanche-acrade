import React, { useState, useEffect } from 'react';
import { Award, User, Clock, CheckCircle, ExternalLink, Trophy, Coins } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import NftAbi from "../ContractAbi/Nft.json"

const GAME_SCORE_NFT_ABI = NftAbi;
const GAME_SCORE_NFT_CONTRACT = "0xA4Ed3766BcE57eD54D13B94560a7eEDd2969cfF8";

interface NFTMarketplaceProps {
  walletAddress: string;
  walletConnected: boolean;
  scoreToMint?: number;
  onClaimComplete?: () => void;
}

interface NFTData {
  score: number;
  balance: number;
  totalMinted: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

interface UserNFTData {
  address: string;
  totalCount: number;
  scores: number[];
}

const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({ 
  walletAddress, 
  walletConnected,
  scoreToMint = 0,
  onClaimComplete = () => {}
}) => {
  console.log('NFTMarketplace rendered with scoreToMint:', scoreToMint);
  console.log('walletConnected:', walletConnected);
  console.log('walletAddress:', walletAddress);
  
  const [filter, setFilter] = useState<'all' | 'owned' | 'available' | 'leaderboard'>('all');
  const [myNFTs, setMyNFTs] = useState<NFTData[]>([]);
  const [allNFTs, setAllNFTs] = useState<NFTData[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserNFTData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // NEW: Track claimed NFTs to prevent double minting
  const [claimedNFTs, setClaimedNFTs] = useState<Set<number>>(new Set());
  const [userOwnedScores, setUserOwnedScores] = useState<Set<number>>(new Set());

  // Get rarity based on score
  const getRarity = (score: number): 'Common' | 'Rare' | 'Epic' | 'Legendary' => {
    if (score <= 5) return 'Common';
    if (score <= 15) return 'Rare';
    if (score <= 20) return 'Epic';
    return 'Legendary';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'text-gray-400 border-gray-600 bg-gray-900/50';
      case 'Rare': return 'text-blue-400 border-blue-600 bg-blue-900/50';
      case 'Epic': return 'text-purple-400 border-purple-600 bg-purple-900/50';
      case 'Legendary': return 'text-yellow-400 border-yellow-600 bg-yellow-900/50';
      default: return 'text-gray-400 border-gray-600 bg-gray-900/50';
    }
  };

  // NEW: Check if user already owns a specific score NFT
  const checkUserOwnership = async () => {
    if (!walletConnected || !walletAddress) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(GAME_SCORE_NFT_CONTRACT, GAME_SCORE_NFT_ABI, provider);
      
      const [scores, balances] = await contract.getMyScoreNFTs();
      const ownedScores = new Set<number>();
      
      for (let i = 0; i < scores.length; i++) {
        const score = parseInt(scores[i].toString());
        const balance = parseInt(balances[i].toString());
        
        if (balance > 0) {
          ownedScores.add(score);
        }
      }
      
      setUserOwnedScores(ownedScores);
    } catch (error) {
      console.error('Error checking user ownership:', error);
    }
  };

  // Load my NFTs
  const loadMyNFTs = async () => {
    if (!walletConnected || !walletAddress) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(GAME_SCORE_NFT_CONTRACT, GAME_SCORE_NFT_ABI, provider);
      
      const [scores, balances] = await contract.getMyScoreNFTs();
      
      const nftData: NFTData[] = [];
      const ownedScores = new Set<number>();
      
      for (let i = 0; i < scores.length; i++) {
        const score = parseInt(scores[i].toString());
        const balance = parseInt(balances[i].toString());
        
        if (balance > 0) {
          const totalMinted = await contract.totalMintedPerScore(score);
          
          nftData.push({
            score,
            balance,
            totalMinted: parseInt(totalMinted.toString()),
            rarity: getRarity(score)
          });
          
          ownedScores.add(score);
        }
      }
      
      setMyNFTs(nftData);
      setUserOwnedScores(ownedScores);
    } catch (error) {
      console.error('Error loading my NFTs:', error);
      toast.error('Failed to load your NFTs');
    } finally {
      setLoading(false);
    }
  };

  // Load all NFTs data
  const loadAllNFTs = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(GAME_SCORE_NFT_CONTRACT, GAME_SCORE_NFT_ABI, provider);
      
      const allNFTsData: NFTData[] = [];
      
      // Check all scores from 1 to 25
      for (let score = 1; score <= 25; score++) {
        const totalMinted = await contract.totalMintedPerScore(score);
        const totalMintedNum = parseInt(totalMinted.toString());
        
        allNFTsData.push({
          score,
          balance: 0, // We don't show individual balances in "all" view
          totalMinted: totalMintedNum,
          rarity: getRarity(score)
        });
      }
      
      setAllNFTs(allNFTsData);
    } catch (error) {
      console.error('Error loading all NFTs:', error);
      toast.error('Failed to load NFT data');
    } finally {
      setLoading(false);
    }
  };

  // Load leaderboard
  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(GAME_SCORE_NFT_CONTRACT, GAME_SCORE_NFT_ABI, provider);
      
      const [users, totalCounts, scores] = await contract.getAllUserDetails();
      
      const leaderboardData: UserNFTData[] = [];
      
      for (let i = 0; i < users.length; i++) {
        leaderboardData.push({
          address: users[i],
          totalCount: parseInt(totalCounts[i].toString()),
          scores: scores[i].map((score: any) => parseInt(score.toString()))
        });
      }
      
      // Sort by total count descending
      leaderboardData.sort((a, b) => b.totalCount - a.totalCount);
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Check if user can claim a specific score
  const canClaimScore = (score: number): boolean => {
    // User can't claim if they already own this score NFT
    if (userOwnedScores.has(score)) return false;
    
    // User can't claim if they've already claimed it in this session
    if (claimedNFTs.has(score)) return false;
    
    return true;
  };

  // Updated Claim NFT function
  const claimNFT = async (score: number) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Check if user can claim this score
    if (!canClaimScore(score)) {
      toast.error(`You already own an NFT for Score ${score}!`);
      return;
    }

    setIsClaiming(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(GAME_SCORE_NFT_CONTRACT, GAME_SCORE_NFT_ABI, signer);

      toast.success('Minting your NFT... Please confirm the transaction');

      const tx = await contract.mintGameScoreNFT(score);
      
      toast.success('Transaction submitted! Waiting for confirmation...');
      
      await tx.wait();
      
      toast.success(`🎉 NFT for Score ${score} minted successfully!`);
      
      // Mark this score as claimed immediately
      setClaimedNFTs(prev => new Set([...prev, score]));
      setUserOwnedScores(prev => new Set([...prev, score]));
      
      // Refresh data after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
      
      onClaimComplete();
      
    } catch (error: any) {
      console.error('Error claiming NFT:', error);
      
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message?.includes('Invalid score')) {
        toast.error('Invalid score for NFT minting');
      } else if (error.message?.includes('already owns')) {
        toast.error('You already own an NFT for this score');
        // Update local state to reflect ownership
        setUserOwnedScores(prev => new Set([...prev, score]));
      } else {
        toast.error('Failed to mint NFT. Please try again.');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // Load data when component mounts or wallet changes
  useEffect(() => {
    if (walletConnected) {
      loadMyNFTs();
      loadAllNFTs();
      loadLeaderboard();
      checkUserOwnership();
    }
  }, [walletConnected, walletAddress, refreshTrigger]);

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (walletConnected) {
        loadAllNFTs();
        loadLeaderboard();
        checkUserOwnership();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [walletConnected]);

  // NEW: Reset claimed NFTs when wallet changes
  useEffect(() => {
    setClaimedNFTs(new Set());
    setUserOwnedScores(new Set());
  }, [walletAddress]);

  const getAvailableScores = () => {
    return allNFTs.filter(nft => nft.totalMinted === 0).map(nft => nft.score);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-black text-white min-h-screen">
      <div className="text-center mb-10">
         <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent leading-normal">
         Dragon NFT Marketplace
    </h2>
        <p className="text-gray-400 max-w-3xl mx-auto text-lg">
          Discover and collect unique Dragon Runner NFTs. Each NFT represents a legendary score achievement!
        </p>
      </div>

      {/* Claim NFT Section */}
      {scoreToMint && scoreToMint > 0 && (
        <div className="mb-8 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/50 rounded-xl p-6">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            
            {/* Check if already claimed */}
            {!canClaimScore(scoreToMint) ? (
              <div>
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4 text-green-400">✅ Already Claimed!</h3>
                <p className="text-lg mb-6">
                  You already own an NFT for score <span className="font-bold text-yellow-400">{scoreToMint}</span>
                </p>
                <div className="px-8 py-4 bg-gray-600 rounded-xl text-lg font-bold text-gray-300 mx-auto inline-block">
                  <CheckCircle className="h-6 w-6 inline mr-3" />
                  NFT Already Owned
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold mb-4 text-green-400">🎉 Claim Your NFT!</h3>
                <p className="text-lg mb-6">
                  Congratulations! You achieved score <span className="text-yellow-400 font-bold">{scoreToMint}</span>
                </p>
                <p className="text-sm text-gray-300 mb-6">
                  This NFT represents your achievement in the game. Mint it now to add it to your collection!
                </p>
                <button
                  onClick={() => claimNFT(scoreToMint)}
                  disabled={isClaiming || !walletConnected}
                  className={`flex items-center space-x-3 px-8 py-4 rounded-xl transition-all transform mx-auto text-lg font-bold shadow-lg ${
                    isClaiming
                      ? 'bg-gray-600 cursor-not-allowed'
                      : walletConnected
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:scale-105'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isClaiming ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Minting NFT...</span>
                    </>
                  ) : !walletConnected ? (
                    <span>Connect Wallet to Claim</span>
                  ) : (
                    <>
                      <Award className="h-6 w-6" />
                      <span>Mint NFT - Score {scoreToMint}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Debug info */}
      <div className="mb-4 p-4 bg-gray-800 rounded-lg text-sm">
        <p>Debug Info:</p>
        <p>scoreToMint: {scoreToMint}</p>
        <p>scoreToMint &gt; 0: {scoreToMint > 0 ? 'true' : 'false'}</p>
        <p>Claim NFT section should show: {scoreToMint && scoreToMint > 0 ? 'YES' : 'NO'}</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          { key: 'all', label: 'All NFTs', icon: Award },
          { key: 'owned', label: 'My Collection', icon: User },
          { key: 'available', label: 'Available Scores', icon: Clock },
          { key: 'leaderboard', label: 'Leaderboard', icon: Trophy }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl border-2 transition-all font-semibold ${
              filter === key
                ? 'bg-white text-black border-white shadow-lg'
                : 'border-gray-600 hover:border-gray-400 hover:bg-gray-800'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 text-center">
          <div className="text-3xl font-bold text-yellow-400">{allNFTs.reduce((sum, nft) => sum + nft.totalMinted, 0)}</div>
          <div className="text-gray-400 text-sm font-medium">Total Minted</div>
        </div>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 text-center">
          <div className="text-3xl font-bold text-green-400">{myNFTs.reduce((sum, nft) => sum + nft.balance, 0)}</div>
          <div className="text-gray-400 text-sm font-medium">My NFTs</div>
        </div>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 text-center">
          <div className="text-3xl font-bold text-blue-400">{getAvailableScores().length}</div>
          <div className="text-gray-400 text-sm font-medium">Available</div>
        </div>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 text-center">
          <div className="text-3xl font-bold text-purple-400">{leaderboard.length}</div>
          <div className="text-gray-400 text-sm font-medium">Collectors</div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading NFT data...</p>
        </div>
      )}

      {/* Available Scores */}
      {filter === 'available' && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">🎯 Available Scores to Claim</h3>
          <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-3">
            {getAvailableScores().map(score => (
              <div
                key={score}
                className={`rounded-xl p-4 text-center hover:scale-105 transition-all cursor-pointer border-2 ${getRarityColor(getRarity(score))}`}
              >
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-xs opacity-80 mt-1">{getRarity(score)}</div>
              </div>
            ))}
          </div>
          {getAvailableScores().length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">🔥 All scores have been claimed! Amazing!</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {filter === 'leaderboard' && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">🏆 Top Collectors</h3>
          <div className="space-y-4">
            {leaderboard.slice(0, 10).map((user, index) => (
              <div key={user.address} className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-700 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className={`font-mono font-bold ${
                      walletAddress && user.address.toLowerCase() === walletAddress.toLowerCase() 
                        ? 'text-green-400' 
                        : 'text-white'
                    }`}>
                      {formatAddress(user.address)}
                      {walletAddress && user.address.toLowerCase() === walletAddress.toLowerCase() && (
                        <span className="ml-2 text-green-400 text-sm">(You)</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Unique Scores: {new Set(user.scores).size} | Total NFTs: {user.totalCount}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {Array.from(new Set(user.scores)).slice(0, 8).map(score => (
                    <span key={score} className={`px-2 py-1 rounded text-xs border ${getRarityColor(getRarity(score))}`}>
                      {score}
                    </span>
                  ))}
                  {new Set(user.scores).size > 8 && (
                    <span className="px-2 py-1 rounded text-xs border border-gray-600 text-gray-400">
                      +{new Set(user.scores).size - 8}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NFT Grid */}
      {(filter === 'all' || filter === 'owned') && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {(filter === 'owned' ? myNFTs : allNFTs).map((nft) => (
            <div key={nft.score} className={`rounded-xl border-2 overflow-hidden hover:scale-105 transition-all group ${getRarityColor(nft.rarity)}`}>
              <div className="relative">
                <img
                  src="/dragonlogo1.jpg"
                  alt={`Dragon NFT #${nft.score}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRarityColor(nft.rarity)}`}>
                    {nft.rarity}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-2 rounded-lg">
                  <span className="text-white font-bold text-lg">#{nft.score}</span>
                </div>
                {filter === 'owned' && nft.balance > 1 && (
                  <div className="absolute top-3 left-3 bg-green-500 px-2 py-1 rounded-full text-xs font-bold">
                    x{nft.balance}
                  </div>
                )}
                {/* NEW: Show owned indicator */}
                {filter === 'all' && userOwnedScores.has(nft.score) && (
                  <div className="absolute top-3 left-3 bg-green-500 px-2 py-1 rounded-full text-xs font-bold">
                    ✓ Owned
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">Dragon Score #{nft.score}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Minted:</span>
                    <span className="text-white font-bold">{nft.totalMinted}</span>
                  </div>
                  
                  {filter === 'owned' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">You Own:</span>
                      <span className="text-green-400 font-bold">{nft.balance}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rarity:</span>
                    <span className={`font-bold ${
                      nft.rarity === 'Common' ? 'text-gray-400' :
                      nft.rarity === 'Rare' ? 'text-blue-400' :
                      nft.rarity === 'Epic' ? 'text-purple-400' :
                      'text-yellow-400'
                    }`}>
                      {nft.rarity}
                    </span>
                  </div>
                </div>

                {nft.totalMinted === 0 && !userOwnedScores.has(nft.score) && (
                  <div className="mt-3 px-3 py-2 bg-green-900/30 border border-green-700 rounded text-green-400 text-xs text-center animate-pulse">
                    Available to Claim!
                  </div>
                )}
                
                {userOwnedScores.has(nft.score) && (
                  <div className="mt-3 px-3 py-2 bg-green-900/30 border border-green-700 rounded text-green-400 text-xs text-center">
                    ✅ You Own This NFT
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && (
        <>
          {filter === 'owned' && myNFTs.length === 0 && walletConnected && (
            <div className="text-center py-16">
              <User className="h-20 w-20 text-gray-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-3">No NFTs Yet</h3>
              <p className="text-gray-400 text-lg">
                Play Dragon Runner and achieve high scores to claim your first NFT!
              </p>
            </div>
          )}

          {filter === 'all' && allNFTs.length === 0 && (
            <div className="text-center py-16">
              <Coins className="h-20 w-20 text-gray-600 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-3">Loading NFT Collection...</h3>
              <p className="text-gray-400 text-lg">
                Fetching all Dragon Runner NFTs from the blockchain...
              </p>
            </div>
          )}
        </>
      )}

      {!walletConnected && (
        <div className="mt-12 p-8 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-2xl text-center">
          <h3 className="text-2xl font-bold mb-4 text-yellow-400">🔗 Connect Your Wallet</h3>
          <p className="text-yellow-200 text-lg">
            Connect your wallet to view your NFT collection, check the leaderboard, and claim new NFTs after winning games!
          </p>
        </div>
      )}

      {/* Contract Info */}
      <div className="mt-12 p-6 bg-gray-900/50 rounded-xl border border-gray-700">
        <h4 className="font-bold mb-3 flex items-center">
          <ExternalLink className="h-5 w-5 mr-2" />
          Smart Contract Details
        </h4>
        <div className="text-sm text-gray-300 space-y-1">
          <p><span className="text-gray-400">Contract:</span> <code className="bg-gray-800 px-2 py-1 rounded font-mono">{GAME_SCORE_NFT_CONTRACT}</code></p>
          <p><span className="text-gray-400">Network:</span> Avalanche Fuji</p>
          <p><span className="text-gray-400">Standard:</span> ERC-1155</p>
        </div>
      </div>
    </div>
  );
};

export default NFTMarketplace;