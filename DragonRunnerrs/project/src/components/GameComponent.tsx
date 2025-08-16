import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Award, Coins } from 'lucide-react';
import { ethers } from 'ethers';
import DtokenAbi from "../ContractAbi/Dtoken.json";
import toast from 'react-hot-toast';
interface GameComponentProps {
  onScore?: (score: number) => void;
  onClaimNFT?: (score: number) => void;
  claimedScores?: Set<number>;
  walletConnected?: boolean;
  dtTokenBalance: string;
  onRefreshTokenBalance: () => void;
}

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Dragon extends GameObject {
  velocityY: number;
  isJumping: boolean;
}

interface Obstacle extends GameObject {
  passed: boolean;
}

// Dragon Token Contract ABI
const DT_CONTRACT_ABI = DtokenAbi;

// Replace with your actual Dragon Token contract address
const DT_CONTRACT_ADDRESS = "0x079Fe31EE22088a6B9cB2615D8e6AB9DFb3A75a5";

const GameComponent: React.FC<GameComponentProps> = ({ 
  onScore = () => {}, 
  onClaimNFT = () => {}, 
  claimedScores = new Set(), 
  walletConnected = false,
  dtTokenBalance,
  onRefreshTokenBalance
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const gameLoopRef = useRef<boolean>(false);
  const gameObjectsRef = useRef({
    dragon: null as Dragon | null,
    obstacles: [] as Obstacle[],
    gameSpeed: 3,
    score: 0
  });
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [isPayingForGame, setIsPayingForGame] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage?.getItem('dragonHighScore');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Constants
  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  const GROUND_Y = 320;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const OBSTACLE_GAP = 250;
  const GAME_COST_DT = 1; // Cost to play one game

  // Check if player has enough tokens to play
  const hasEnoughTokens = parseFloat(dtTokenBalance) >= GAME_COST_DT;

  // Initialize game objects
  const initializeGame = useCallback(() => {
    gameObjectsRef.current = {
      dragon: {
        x: 80,
        y: GROUND_Y - 40,
        width: 40,
        height: 40,
        velocityY: 0,
        isJumping: false
      },
      obstacles: [],
      gameSpeed: 3,
      score: 0
    };
  }, []);

  // Function to spend DT tokens before starting game
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

    setIsPayingForGame(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(DT_CONTRACT_ADDRESS, DT_CONTRACT_ABI, signer);
      
      // Call the playGame function which deducts 1 DT token
      const tx = await contract.playGame();
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Refresh token balance after successful transaction
      onRefreshTokenBalance();
      
      return true;
    } catch (error: any) {
      console.error('Error spending DT token:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Not enough tokens to play')) {
        
         toast.success(`Insufficient DT tokens to play the game`, {
  duration: 3000,
});
      } else if (error.code === 4001) {
        
         toast.success(`Transaction cancelled by user`, {
  duration: 3000,
});
      } else {
       
         toast.success(`Failed to spend DT token. Please try again.`, {
  duration: 3000,
});
      }
      
      return false;
    } finally {
      setIsPayingForGame(false);
    }
  };

  // Game loop (unchanged from original)
  const gameLoop = useCallback(() => {
    if (!gameLoopRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameObjects = gameObjectsRef.current;
    if (!gameObjects.dragon) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update dragon physics
    const dragon = gameObjects.dragon;
    
    // Apply gravity
    if (dragon.y < GROUND_Y - dragon.height || dragon.velocityY < 0) {
      dragon.velocityY += GRAVITY;
      dragon.y += dragon.velocityY;
    }

    // Ground collision
    if (dragon.y >= GROUND_Y - dragon.height) {
      dragon.y = GROUND_Y - dragon.height;
      dragon.velocityY = 0;
      dragon.isJumping = false;
    }

    // Update obstacles
    const obstacles = gameObjects.obstacles;
    
    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.x -= gameObjects.gameSpeed;

      // Remove off-screen obstacles
      if (obstacle.x + obstacle.width < 0) {
        obstacles.splice(i, 1);
        continue;
      }

      // Check for scoring
      if (!obstacle.passed && obstacle.x + obstacle.width < dragon.x) {
        obstacle.passed = true;
        gameObjects.score += 1;
        if( gameObjects.score >25){
           gameObjects.score = 25;
        }
        setScore(gameObjects.score);
        onScore(gameObjects.score);
      }
    }

    // Add new obstacles
    if (obstacles.length === 0 || 
        obstacles[obstacles.length - 1].x < CANVAS_WIDTH - OBSTACLE_GAP) {
      const obstacleHeight = 40 + Math.random() * 60;
      obstacles.push({
        x: CANVAS_WIDTH + 50,
        y: GROUND_Y - obstacleHeight,
        width: 30,
        height: obstacleHeight,
        passed: false
      });
    }

    // Draw ground
    ctx.fillStyle = '#2d4a22';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // Draw ground line
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Draw dragon with more detail
    const dragonColor = dragon.isJumping ? '#fbbf24' : '#f59e0b';
    
    // Dragon body
    ctx.fillStyle = dragonColor;
    ctx.fillRect(dragon.x, dragon.y, dragon.width, dragon.height);
    
    // Dragon head
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(dragon.x + 30, dragon.y + 5, 15, 15);
    
    // Dragon eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dragon.x + 35, dragon.y + 8, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(dragon.x + 36, dragon.y + 9, 2, 2);
    
    // Dragon wings
    if (dragon.isJumping || dragon.velocityY !== 0) {
      ctx.fillStyle = '#065f46';
      ctx.fillRect(dragon.x + 10, dragon.y - 5, 20, 10);
      ctx.fillRect(dragon.x + 15, dragon.y + 35, 15, 8);
    } else {
      ctx.fillStyle = '#047857';
      ctx.fillRect(dragon.x + 15, dragon.y + 10, 15, 8);
    }
    
    // Dragon tail
    ctx.fillStyle = dragonColor;
    ctx.fillRect(dragon.x - 10, dragon.y + 15, 12, 8);

    // Draw obstacles with gradient
    obstacles.forEach(obstacle => {
      const obstacleGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      obstacleGradient.addColorStop(0, '#7c3aed');
      obstacleGradient.addColorStop(1, '#5b21b6');
      ctx.fillStyle = obstacleGradient;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      
      // Obstacle highlight
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 3);
    });

    // Draw clouds in background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    const cloudOffset = (Date.now() * 0.01) % (CANVAS_WIDTH + 100);
    for (let i = 0; i < 3; i++) {
      const x = (i * 300 - cloudOffset) % (CANVAS_WIDTH + 100);
      const y = 50 + i * 30;
      ctx.fillRect(x, y, 60, 20);
      ctx.fillRect(x + 15, y - 10, 30, 20);
      ctx.fillRect(x + 30, y + 10, 40, 15);
    }

    // Draw score with shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`Score: ${gameObjects.score}`, 22, 42);
    ctx.fillText(`High: ${highScore}`, 22, 72);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Score: ${gameObjects.score}`, 20, 40);
    ctx.fillText(`High: ${highScore}`, 20, 70);

    // Draw speed indicator
    ctx.fillStyle = '#10b981';
    ctx.font = '16px monospace';
    ctx.fillText(`Speed: ${gameObjects.gameSpeed.toFixed(1)}x`, CANVAS_WIDTH - 140, 30);

    // Check collisions with better precision
    obstacles.forEach(obstacle => {
      if (dragon.x + 5 < obstacle.x + obstacle.width - 5 &&
          dragon.x + dragon.width - 5 > obstacle.x + 5 &&
          dragon.y + 5 < obstacle.y + obstacle.height - 5 &&
          dragon.y + dragon.height - 5 > obstacle.y + 5) {
        gameLoopRef.current = false;
        setGameState('gameOver');
        if (gameObjects.score > highScore) {
          setHighScore(gameObjects.score);
          try {
            localStorage?.setItem('dragonHighScore', gameObjects.score.toString());
          } catch {}
        }
        return;
      }
    });

    // Increase game speed gradually
    gameObjects.gameSpeed = Math.min(gameObjects.gameSpeed + 0.003, 8);

    if (gameLoopRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [highScore, onScore]);

  // Start game loop when playing
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = true;
      gameLoop();
    } else {
      gameLoopRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      gameLoopRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameLoop]);

  const jump = useCallback(() => {
    if (gameState === 'playing' && gameObjectsRef.current.dragon) {
      const dragon = gameObjectsRef.current.dragon;
      // Only jump if on ground or close to ground
      if (dragon.y >= GROUND_Y - dragon.height - 5) {
        dragon.velocityY = JUMP_FORCE;
        dragon.isJumping = true;
      }
    }
  }, [gameState]);

  const startGame = useCallback(async () => {
    if (isPayingForGame) return; // Prevent double clicks while processing
    
    // Spend DT token before starting game
    const paymentSuccess = await spendTokenForGame();
    
    if (paymentSuccess) {
      initializeGame();
      setGameState('playing');
      setScore(0);
    }
  }, [initializeGame, isPayingForGame, spendTokenForGame]);

  const resetGame = useCallback(() => {
    gameLoopRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initializeGame();
    setGameState('idle');
    setScore(0);
  }, [initializeGame]);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'idle') {
          startGame();
        } else if (gameState === 'playing') {
          jump();
        } else if (gameState === 'gameOver') {
          resetGame();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyPress);
    };
  }, [gameState, startGame, jump, resetGame]);

  const isScoreClaimed = claimedScores.has(score);
  const canClaimNFT = gameState === 'gameOver' && score > 0 && !isScoreClaimed && walletConnected;

  return (
  <div className="max-w-6xl mx-auto p-4 bg-black text-white min-h-screen">
  <div className="text-center mb-10">
    <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent leading-normal">
      Dragon Runner
    </h2>
    
    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
      Guide the mighty dragon through mystical obstacles and achieve unique scores to claim exclusive NFTs.
      Each game costs <span className="text-white font-semibold">1 DT token</span> — make your flight legendary!
    </p>
  </div>


      {/* Token Cost Warning */}
      {!hasEnoughTokens && walletConnected && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-yellow-300">
            <Coins className="h-5 w-5" />
            <span className="font-semibold">Insufficient DT Tokens</span>
          </div>
          <p className="text-yellow-200 text-sm mt-2">
            You need {GAME_COST_DT} DT token to play. Current balance: {parseFloat(dtTokenBalance).toFixed(2)} DT
          </p>
          <p className="text-yellow-200 text-sm">
            Purchase more DT tokens to continue playing!
          </p>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex flex-col xl:flex-row items-start justify-center space-y-6 xl:space-y-0 xl:space-x-8">
          {/* Game Canvas */}
          <div className="relative mx-auto">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border-2 border-gray-600 rounded-lg cursor-pointer shadow-lg"
              onClick={gameState === 'playing' ? jump : gameState === 'idle' ? startGame : resetGame}
            />
            
            {/* Game Overlays */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
                <div className="text-center">
               
                  <h3 className="text-4xl font-bold mb-6 text-orange-400">Ready to Soar?</h3>
                  
                  {/* Game Cost Display */}
                  <div className="mb-6 p-4 bg-gray-800/80 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-center space-x-2 text-yellow-300 mb-2">
                      <Coins className="h-5 w-5" />
                      <span className="font-semibold">Game Cost: {GAME_COST_DT} DT Token</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Your Balance: {parseFloat(dtTokenBalance).toFixed(2)} DT
                    </p>
                  </div>

                  <button
                    onClick={startGame}
                    disabled={isPayingForGame || !hasEnoughTokens || !walletConnected}
                    className={`flex items-center space-x-3 px-10 py-5 rounded-xl transition-all transform mx-auto text-xl font-bold shadow-lg ${
                      isPayingForGame
                        ? 'bg-gray-600 cursor-not-allowed'
                        : !hasEnoughTokens || !walletConnected
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:scale-105'
                    }`}
                  >
                    {isPayingForGame ? (
                      <>
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : !walletConnected ? (
                      <>
                        <span>Connect Wallet to Play</span>
                      </>
                    ) : !hasEnoughTokens ? (
                      <>
                        <span>Need More DT Tokens</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-7 w-7" />
                        <span>Start Adventure</span>
                      </>
                    )}
                  </button>
                  
                  {walletConnected && hasEnoughTokens && (
                    <div className="mt-6 space-y-3 text-gray-300">
                      <p className="text-lg font-semibold">🎮 Controls:</p>
                      <div className="flex justify-center space-x-4 text-sm">
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">SPACE</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">↑</kbd>
                        <span className="px-3 py-2 bg-gray-700 rounded-md">CLICK</span>
                      </div>
                      <p className="text-sm text-gray-400">Press any to jump and start!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {gameState === 'gameOver' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-lg backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">💥</div>
                  <h3 className="text-4xl font-bold mb-3 text-red-400">Dragon Down!</h3>
                  <p className="text-3xl mb-4 text-yellow-400 font-bold">Final Score: {score}</p>
                  {score > highScore && score > 0 && (
                    <p className="text-green-400 mb-6 text-xl animate-pulse">🎉 New High Score!</p>
                  )}
                  
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      onClick={resetGame}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 text-lg font-bold shadow-lg"
                    >
                      <RotateCcw className="h-6 w-6" />
                      <span>Fly Again (1 DT)</span>
                    </button>

                    {canClaimNFT && ( 
                      <button
                        onClick={() => onClaimNFT(score)}
                        className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 text-lg font-bold shadow-lg animate-pulse"
                      >
                        <Award className="h-6 w-6" />
                        <span>Claim NFT - Score {score}</span>
                      </button>
                    )}

                    {isScoreClaimed && score > 0 && (
                      <div className="text-yellow-400 text-center max-w-sm bg-yellow-900/30 p-4 rounded-lg border border-yellow-600">
                        <p className="font-bold">⚠️ Score {score} Claimed!</p>
                        <p className="text-sm mt-2">Mint it from market place</p>
                      </div>
                    )}

                    {!walletConnected && score > 0 && (
                      <div className="text-gray-400 text-center bg-gray-800/50 p-4 rounded-lg">
                        <p className="font-semibold">🔗 Connect Wallet</p>
                        <p className="text-sm mt-1">Connect your wallet to claim NFT rewards</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-6">Press SPACE to restart your journey</p>
                </div>
              </div>
            )}
          </div>

          {/* Game Stats & Info */}
          <div className="space-y-6 w-full xl:w-80">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-2xl font-bold mb-4 flex items-center text-yellow-400">
                <Award className="h-6 w-6 mr-3" />
                Dragon Stats
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Current Score:</span>
                  <span className="font-mono text-2xl font-bold text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Best Flight:</span>
                  <span className="font-mono text-2xl font-bold text-yellow-400">{highScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">DT Balance:</span>
                  <span className="font-mono text-xl font-bold text-green-400">{parseFloat(dtTokenBalance).toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">NFTs Claimed:</span>
                  <span className="font-mono text-xl font-bold text-green-400">{claimedScores.size}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((score / 20) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 text-center">Progress to next tier</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-xl p-6 border border-yellow-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-yellow-300">💰 Game Economy</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Cost per Game:</span>
                  <span className="text-yellow-400 font-bold">{GAME_COST_DT} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Your Balance:</span>
                  <span className="text-green-400 font-bold">{parseFloat(dtTokenBalance).toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Games Available:</span>
                  <span className="text-blue-400 font-bold">{Math.floor(parseFloat(dtTokenBalance) / GAME_COST_DT)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-yellow-400/30">
                <p className="text-xs text-yellow-200 font-medium">
                  🎯 Each game costs 1 DT token. Tokens are deducted when you start playing!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-orange-400">🎮 Dragon Controls</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">SPACE</kbd>
                  <span className="text-gray-300">Flap Wings</span>
                </div>
                <div className="flex items-center space-x-4">
                  <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">↑</kbd>
                  <span className="text-gray-300">Soar Higher</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm bg-gray-700 px-3 py-2 rounded-lg border border-gray-500">CLICK</span>
                  <span className="text-gray-300">Mouse Jump</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-green-400">🏆 Quest Rules</h4>
              <ul className="text-sm text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  Dodge the mystical purple obstacles
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  Each obstacle passed = +1 score
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  Speed increases as you progress
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  Unique scores unlock rare NFTs
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-purple-300">💎 NFT Treasures</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 1-10:</span>
                  <span className="text-gray-400 font-semibold">⚪ Common</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 11-25:</span>
                  <span className="text-blue-400 font-semibold">🔵 Rare</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 26-50:</span>
                  <span className="text-purple-400 font-semibold">🟣 Epic</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 51+:</span>
                  <span className="text-yellow-400 font-semibold">⭐ Legendary</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-purple-400/30">
                <p className="text-xs text-purple-200 font-medium">
                  🎯 Each score can only be claimed ONCE across all dragon riders!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameComponent;