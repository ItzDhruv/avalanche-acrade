import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Award, Coins, Car, Trophy } from 'lucide-react';
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

interface PlayerCar extends GameObject {
  lane: number; // 0, 1, 2 for three lanes
}

interface Obstacle extends GameObject {
  passed: boolean;
  type: 'car' | 'cone' | 'truck';
}

// Car Token Contract ABI
const DT_CONTRACT_ABI = DtokenAbi;

// Replace with your actual Dragon Token contract address
const DT_CONTRACT_ADDRESS = "0x079Fe31EE22088a6B9cB2615D8e6AB9DFb3A75a5";

const CarRunnerGame: React.FC<GameComponentProps> = ({ 
  onScore = () => {}, 
  onClaimNFT = () => {}, 
  claimedScores = new Set(), 
  walletConnected = false,
  dtTokenBalance = "5.0",
  onRefreshTokenBalance = () => {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const gameLoopRef = useRef<boolean>(false);
  const keysRef = useRef<{[key: string]: boolean}>({});
  const gameObjectsRef = useRef({
    playerCar: null as PlayerCar | null,
    obstacles: [] as Obstacle[],
    gameSpeed: 4,
    score: 0,
    distanceTraveled: 0,
    roadOffset: 0
  });
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver' | 'won'>('idle');
  const [score, setScore] = useState(0);
  const [isPayingForGame, setIsPayingForGame] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage?.getItem('carRunnerHighScore');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const LANE_WIDTH = CANVAS_WIDTH / 3;
  const CAR_WIDTH = 60;
  const CAR_HEIGHT = 100;
  const OBSTACLE_SPAWN_RATE = 0.015;
  const DISTANCE_PER_SCORE = 100;
  const MAX_SCORE = 25;
  const GAME_COST_DT = 1;

  // Check if player has enough tokens to play
  const hasEnoughTokens = parseFloat(dtTokenBalance) >= GAME_COST_DT;

  // Initialize game objects
  const initializeGame = useCallback(() => {
    gameObjectsRef.current = {
      playerCar: {
        x: LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2, // Start in middle lane
        y: CANVAS_HEIGHT - CAR_HEIGHT - 50,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        lane: 1
      },
      obstacles: [],
      gameSpeed: 4,
      score: 0,
      distanceTraveled: 0,
      roadOffset: 0
    };
  }, []);

  // Function to spend DT tokens before starting game
  const spendTokenForGame = async (): Promise<boolean> => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (!hasEnoughTokens) {
      toast.error(`You need ${GAME_COST_DT} DT token to race. Current balance: ${dtTokenBalance} DT`);
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
      
      toast.success('DT token spent successfully! Starting race...');
      return true;
    } catch (error: any) {
      console.error('Error spending DT token:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Not enough tokens to play')) {
        toast.error('Insufficient DT tokens to start the race');
      } else if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Failed to spend DT token. Please try again.');
      }
      
      return false;
    } finally {
      setIsPayingForGame(false);
    }
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameLoopRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameObjects = gameObjectsRef.current;
    if (!gameObjects.playerCar) return;

    // Clear canvas with road background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#2d3748');
    gradient.addColorStop(1, '#1a202c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update road offset for scrolling effect
    gameObjects.roadOffset = (gameObjects.roadOffset + gameObjects.gameSpeed) % 80;

    // Draw road with lanes
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw road lanes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    
    // Lane dividers
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * LANE_WIDTH, -gameObjects.roadOffset);
      ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT + gameObjects.roadOffset);
      ctx.stroke();
    }

    // Draw road edges
    ctx.setLineDash([]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.moveTo(CANVAS_WIDTH, 0);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();

    // Handle player car movement
    const playerCar = gameObjects.playerCar;
    
    // Smooth lane changing
    const targetX = playerCar.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    const dx = targetX - playerCar.x;
    if (Math.abs(dx) > 2) {
      playerCar.x += dx * 0.15;
    } else {
      playerCar.x = targetX;
    }

    // Handle input for lane changes
    if (keysRef.current['ArrowLeft'] && playerCar.lane > 0) {
      playerCar.lane = Math.max(0, playerCar.lane - 1);
      keysRef.current['ArrowLeft'] = false; // Prevent continuous lane changes
    }
    if (keysRef.current['ArrowRight'] && playerCar.lane < 2) {
      playerCar.lane = Math.min(2, playerCar.lane + 1);
      keysRef.current['ArrowRight'] = false; // Prevent continuous lane changes
    }

    // Update distance and score
    gameObjects.distanceTraveled += gameObjects.gameSpeed;
    const newScore = Math.min(Math.floor(gameObjects.distanceTraveled / DISTANCE_PER_SCORE), MAX_SCORE);
    if (newScore > gameObjects.score) {
      gameObjects.score = newScore;
setScore(Math.floor(gameObjects.score / 10));
onScore(Math.floor(gameObjects.score / 10));

    }

    // Check for win condition
    // if (gameObjects.score >= MAX_SCORE) {
    //   gameLoopRef.current = false;
    //   setGameState('won');
    //   if (gameObjects.score > highScore) {
    //     setHighScore(gameObjects.score);
    //     try {
    //       localStorage?.setItem('carRunnerHighScore', gameObjects.score.toString());
    //     } catch {}
    //   }
    //   return;
    // }

    // Update obstacles
    const obstacles = gameObjects.obstacles;
    
    // Move obstacles down
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.y += gameObjects.gameSpeed;

      // Remove off-screen obstacles
      if (obstacle.y > CANVAS_HEIGHT) {
        obstacles.splice(i, 1);
        continue;
      }

      // Mark as passed if behind player
      if (!obstacle.passed && obstacle.y > playerCar.y + playerCar.height) {
        obstacle.passed = true;
      }
    }

    // Spawn new obstacles
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
      const obstacleType = Math.random() < 0.6 ? 'car' : Math.random() < 0.8 ? 'cone' : 'truck';
      const lane = Math.floor(Math.random() * 3);
      const obstacleWidth = obstacleType === 'cone' ? 30 : obstacleType === 'truck' ? 80 : 60;
      const obstacleHeight = obstacleType === 'cone' ? 40 : obstacleType === 'truck' ? 120 : 100;
      
      obstacles.push({
        x: lane * LANE_WIDTH + (LANE_WIDTH - obstacleWidth) / 2,
        y: -obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight,
        passed: false,
        type: obstacleType
      });
    }

    // Draw player car
    ctx.fillStyle = '#3b82f6'; // Blue car
    ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    
    // Car details
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(playerCar.x + 5, playerCar.y + 10, playerCar.width - 10, 20); // Windshield
    ctx.fillRect(playerCar.x + 5, playerCar.y + playerCar.height - 30, playerCar.width - 10, 20); // Rear window
    
    // Car lights
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(playerCar.x + 10, playerCar.y + playerCar.height - 10, 15, 8);
    ctx.fillRect(playerCar.x + playerCar.width - 25, playerCar.y + playerCar.height - 10, 15, 8);
    
    // Car wheels
    ctx.fillStyle = '#374151';
    ctx.fillRect(playerCar.x - 5, playerCar.y + 15, 10, 20);
    ctx.fillRect(playerCar.x + playerCar.width - 5, playerCar.y + 15, 10, 20);
    ctx.fillRect(playerCar.x - 5, playerCar.y + playerCar.height - 35, 10, 20);
    ctx.fillRect(playerCar.x + playerCar.width - 5, playerCar.y + playerCar.height - 35, 10, 20);

    // Draw obstacles
    obstacles.forEach(obstacle => {
      switch (obstacle.type) {
        case 'car':
          // Enemy car
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          
          // Car details
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(obstacle.x + 5, obstacle.y + 10, obstacle.width - 10, 20);
          ctx.fillRect(obstacle.x + 5, obstacle.y + obstacle.height - 30, obstacle.width - 10, 20);
          
          // Lights
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obstacle.x + 10, obstacle.y + 5, 15, 8);
          ctx.fillRect(obstacle.x + obstacle.width - 25, obstacle.y + 5, 15, 8);
          break;
          
        case 'cone':
          // Traffic cone
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
          ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
          ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
          ctx.closePath();
          ctx.fill();
          
          // Cone stripes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obstacle.x + 5, obstacle.y + obstacle.height * 0.3, obstacle.width - 10, 3);
          ctx.fillRect(obstacle.x + 8, obstacle.y + obstacle.height * 0.6, obstacle.width - 16, 3);
          break;
          
        case 'truck':
          // Truck
          ctx.fillStyle = '#059669';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          
          // Truck cab
          ctx.fillStyle = '#047857';
          ctx.fillRect(obstacle.x + 10, obstacle.y + obstacle.height - 40, obstacle.width - 20, 30);
          
          // Truck lights
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(obstacle.x + 15, obstacle.y + 5, 12, 8);
          ctx.fillRect(obstacle.x + obstacle.width - 27, obstacle.y + 5, 12, 8);
          break;
      }
    });

    // Draw speedometer effect
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = Math.random() * CANVAS_HEIGHT;
      const speed = gameObjects.gameSpeed * (1 + Math.random());
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`;
      ctx.fillRect(x, y, 2, speed * 2);
    }

    // Draw UI
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 80);
    
    // Score display
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(`Score: ${gameObjects.score}/${MAX_SCORE}`, 20, 40);
    ctx.fillText(`High: ${highScore}`, 20, 70);
    
    // Speed indicator
    ctx.fillStyle = '#10b981';
    ctx.font = '18px monospace';
    ctx.fillText(`Speed: ${gameObjects.gameSpeed.toFixed(1)}x`, CANVAS_WIDTH - 150, 30);
    
    // Distance indicator
    ctx.fillText(`Distance: ${Math.floor(gameObjects.distanceTraveled)}m`, CANVAS_WIDTH - 200, 55);

    // Progress bar
    const progressWidth = 200;
    const progressX = CANVAS_WIDTH - progressWidth - 20;
    const progressY = 5;
    const progress = gameObjects.score / MAX_SCORE;
    
    ctx.fillStyle = '#374151';
    ctx.fillRect(progressX, progressY, progressWidth, 10);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(progressX, progressY, progressWidth * progress, 10);

    // Check collisions
    obstacles.forEach(obstacle => {
      if (playerCar.x + 10 < obstacle.x + obstacle.width - 10 &&
          playerCar.x + playerCar.width - 10 > obstacle.x + 10 &&
          playerCar.y + 10 < obstacle.y + obstacle.height - 10 &&
          playerCar.y + playerCar.height - 10 > obstacle.y + 10) {
        gameLoopRef.current = false;
        setGameState('gameOver');
        if (gameObjects.score > highScore) {
          setHighScore(gameObjects.score);
          try {
            localStorage?.setItem('carRunnerHighScore', gameObjects.score.toString());
          } catch {}
        }
        return;
      }
    });

    // Increase game speed gradually
    gameObjects.gameSpeed = Math.min(gameObjects.gameSpeed + 0.002, 8);

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

  const startGame = useCallback(async () => {
    if (isPayingForGame) return;
    
    const paymentSuccess = await spendTokenForGame();
    
    if (paymentSuccess) {
      initializeGame();
      setGameState('playing');
      setScore(0);
    }
  }, [initializeGame, isPayingForGame]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (gameState === 'playing') {
          keysRef.current[e.code] = true;
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'idle') {
          startGame();
        } else if (gameState === 'gameOver' || gameState === 'won') {
          resetGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startGame, resetGame]);

  const isScoreClaimed = claimedScores.has(score);
  const canClaimNFT = (gameState === 'gameOver' || gameState === 'won') && score > 0 && !isScoreClaimed && walletConnected;

  return (
    <div className="max-w-6xl mx-auto p-4 bg-black text-white min-h-screen">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-normal">
          🏎️ Speed Racer
        </h2>
        
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Navigate through traffic at high speeds and achieve unique scores to claim exclusive NFTs.
          Each race costs <span className="text-white font-semibold">1 DT token</span> — drive like your life depends on it!
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
            You need {GAME_COST_DT} DT token to race. Current balance: {parseFloat(dtTokenBalance).toFixed(2)} DT
          </p>
          <p className="text-yellow-200 text-sm">
            Purchase more DT tokens to continue racing!
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
              className="border-2 border-gray-600 rounded-lg shadow-lg"
            />
            
            {/* Game Overlays */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏁</div>
                  <h3 className="text-4xl font-bold mb-6 text-blue-400">Ready to Race?</h3>
                  
                  {/* Game Cost Display */}
                  <div className="mb-6 p-4 bg-gray-800/80 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-center space-x-2 text-yellow-300 mb-2">
                      <Coins className="h-5 w-5" />
                      <span className="font-semibold">Race Entry: {GAME_COST_DT} DT Token</span>
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
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:scale-105'
                    }`}
                  >
                    {isPayingForGame ? (
                      <>
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : !walletConnected ? (
                      <>
                        <span>Connect Wallet to Race</span>
                      </>
                    ) : !hasEnoughTokens ? (
                      <>
                        <span>Need More DT Tokens</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-7 w-7" />
                        <span>Start Racing</span>
                      </>
                    )}
                  </button>
                  
                  {walletConnected && hasEnoughTokens && (
                    <div className="mt-6 space-y-3 text-gray-300">
                      <p className="text-lg font-semibold">🎮 Controls:</p>
                      <div className="flex justify-center space-x-4 text-sm">
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">←</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">→</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">SPACE</kbd>
                      </div>
                      <p className="text-sm text-gray-400">Use arrow keys to change lanes!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {gameState === 'gameOver' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-lg backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">💥</div>
                  <h3 className="text-4xl font-bold mb-3 text-red-400">Crashed!</h3>
                  <p className="text-3xl mb-4 text-yellow-400 font-bold">Final Score: {score}/25</p>
                  {score > highScore && score > 0 && (
                    <p className="text-green-400 mb-6 text-xl animate-pulse">🎉 New High Score!</p>
                  )}
                  
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      onClick={resetGame}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 text-lg font-bold shadow-lg"
                    >
                      <RotateCcw className="h-6 w-6" />
                      <span>Race Again (1 DT)</span>
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
                        <p className="text-sm mt-2">Mint it from marketplace</p>
                      </div>
                    )}

                    {!walletConnected && score > 0 && (
                      <div className="text-gray-400 text-center bg-gray-800/50 p-4 rounded-lg">
                        <p className="font-semibold">🔗 Connect Wallet</p>
                        <p className="text-sm mt-1">Connect your wallet to claim NFT rewards</p>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-6">Press SPACE to restart your engine</p>
                </div>
              </div>
            )}

            {gameState === 'won' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-lg backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">🏆</div>
                  <h3 className="text-4xl font-bold mb-3 text-yellow-400 animate-pulse">You Win!</h3>
                  <p className="text-3xl mb-4 text-green-400 font-bold">Perfect Score: {score}/25</p>
                  <p className="text-green-400 mb-6 text-xl">🎉 Racing Champion!</p>
                  
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      onClick={resetGame}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 text-lg font-bold shadow-lg"
                    >
                      <Trophy className="h-6 w-6" />
                      <span>Race Again (1 DT)</span>
                    </button>

                    {canClaimNFT && (
                      <button
                        onClick={() => onClaimNFT(score)}
                        className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 text-lg font-bold shadow-lg animate-pulse"
                      >
                        <Award className="h-6 w-6" />
                        <span>Claim Champion NFT!</span>
                      </button>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-6">Press SPACE to race again</p>
                </div>
              </div>
            )}
          </div>

          {/* Game Stats & Info */}
          <div className="space-y-6 w-full xl:w-80">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-2xl font-bold mb-4 flex items-center text-blue-400">
                <Car className="h-6 w-6 mr-3" />
                Racing Stats
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Current Score:</span>
                  <span className="font-mono text-2xl font-bold text-white">{Math.floor(score/10)}/25</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Best Race:</span>
                  <span className="font-mono text-2xl font-bold text-blue-400">{Math.floor(highScore/10)}/25</span>
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
                    style={{ width: `${Math.min((score / 25) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 text-center">Progress to victory</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-xl p-6 border border-yellow-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-yellow-300">💰 Racing Economy</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Entry Fee:</span>
                  <span className="text-yellow-400 font-bold">{GAME_COST_DT} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Your Balance:</span>
                  <span className="text-green-400 font-bold">{parseFloat(dtTokenBalance).toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Races Available:</span>
                  <span className="text-blue-400 font-bold">{Math.floor(parseFloat(dtTokenBalance) / GAME_COST_DT)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-yellow-400/30">
                <p className="text-xs text-yellow-200 font-medium">
                  🏁 Each race costs 1 DT token. Tokens are deducted when you start racing!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-blue-400">🎮 Racing Controls</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">←</kbd>
                  <span className="text-gray-300">Change Lane Left</span>
                </div>
                <div className="flex items-center space-x-4">
                  <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">→</kbd>
                  <span className="text-gray-300">Change Lane Right</span>
                </div>
                <div className="flex items-center space-x-4">
                  <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">SPACE</kbd>
                  <span className="text-gray-300">Start/Restart</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-red-400">🚗 Racing Rules</h4>
              <ul className="text-sm text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  Stay in your lane, switch lanes to avoid obstacles
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  Avoid red cars, orange cones, and green trucks
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  Score +1 for every 100 meters traveled
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  Reach score 25 to win the race!
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  Speed increases as you progress
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-purple-300">💎 Racing NFTs</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 1-10:</span>
                  <span className="text-gray-400 font-semibold">⚪ Rookie Driver</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 11-20:</span>
                  <span className="text-blue-400 font-semibold">🔵 Pro Racer</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 21-24:</span>
                  <span className="text-purple-400 font-semibold">🟣 Elite Driver</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 25:</span>
                  <span className="text-yellow-400 font-semibold">⭐ Racing Champion</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-purple-400/30">
                <p className="text-xs text-purple-200 font-medium">
                  🏆 Each score can only be claimed ONCE across all racers!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-6 border border-green-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-green-300">🚨 Obstacle Guide</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
                  <span className="text-gray-300">Red Cars - Standard obstacles</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-4 bg-orange-500 rounded-sm"></div>
                  <span className="text-gray-300">Orange Cones - Small but tricky</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-4 bg-green-600 rounded-sm"></div>
                  <span className="text-gray-300">Green Trucks - Large and dangerous</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-green-400/30">
                <p className="text-xs text-green-200 font-medium">
                  💡 Quick lane changes are key to survival at high speeds!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarRunnerGame;