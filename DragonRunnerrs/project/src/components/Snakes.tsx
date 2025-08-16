import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Award, Coins } from 'lucide-react';
import { ethers } from 'ethers';
import DtokenAbi from "../ContractAbi/Dtoken.json";
import toast from 'react-hot-toast';

interface SnakeGameComponentProps {
  onScore?: (score: number) => void;
  onClaimNFT?: (score: number) => void;
  claimedScores?: Set<number>;
  walletConnected?: boolean;
  dtTokenBalance: string;
  onRefreshTokenBalance: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Food extends Position {
  type: 'normal' | 'special' | 'poison';
  points: number;
}

// Snake Token Contract ABI
const DT_CONTRACT_ABI = DtokenAbi;

// Replace with your actual Dragon Token contract address
const DT_CONTRACT_ADDRESS = "0x079Fe31EE22088a6B9cB2615D8e6AB9DFb3A75a5";

const SnakeGameComponent: React.FC<SnakeGameComponentProps> = ({ 
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
    snake: [] as Position[],
    food: null as Food | null,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    gameSpeed: 150,
    lastRender: 0,
    obstacles: [] as Position[]
  });
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [isPayingForGame, setIsPayingForGame] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage?.getItem('snakeHighScore');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const GRID_SIZE = 20;
  const GRID_WIDTH = CANVAS_WIDTH / GRID_SIZE;
  const GRID_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;
  const GAME_COST_DT = 1; // Cost to play one game
  const INITIAL_SNAKE_LENGTH = 4;

  // Check if player has enough tokens to play
  const hasEnoughTokens = parseFloat(dtTokenBalance) >= GAME_COST_DT;

  // Generate random food position
  const generateFood = useCallback((): Food => {
    const gameObjects = gameObjectsRef.current;
    let newFood: Food;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      
      // Determine food type and points based on score for increased difficulty
      let type: 'normal' | 'special' | 'poison' = 'normal';
      let points = 1;
      
      if (gameObjects.score > 10) {
        const rand = Math.random();
        if (rand < 0.1) {
          type = 'poison'; // 10% chance of poison food (loses points)
          points = -2;
        } else if (rand < 0.3) {
          type = 'special'; // 20% chance of special food
          points = 2;
        }
      }

      newFood = { x, y, type, points };
      attempts++;
    } while (
      attempts < maxAttempts &&
      (gameObjects.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
       gameObjects.obstacles.some(obstacle => obstacle.x === newFood.x && obstacle.y === newFood.y))
    );

    return newFood;
  }, []);

  // Generate obstacles for increased difficulty
  const generateObstacles = useCallback((score: number): Position[] => {
    const obstacles: Position[] = [];
    const obstacleCount = Math.floor(score / 5); // Add obstacle every 5 points
    
    for (let i = 0; i < obstacleCount; i++) {
      let obstacle: Position;
      let attempts = 0;
      const maxAttempts = 50;

      do {
        obstacle = {
          x: Math.floor(Math.random() * GRID_WIDTH),
          y: Math.floor(Math.random() * GRID_HEIGHT)
        };
        attempts++;
      } while (
        attempts < maxAttempts &&
        (obstacle.x < 5 || obstacle.y < 5 || // Keep away from starting area
         obstacle.x > GRID_WIDTH - 5 || obstacle.y > GRID_HEIGHT - 5)
      );

      obstacles.push(obstacle);
    }

    return obstacles;
  }, []);

  // Initialize game objects
  const initializeGame = useCallback(() => {
    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);
    
    const snake: Position[] = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      snake.push({ x: centerX - i, y: centerY });
    }

    gameObjectsRef.current = {
      snake,
      food: null,
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      score: 0,
      gameSpeed: 150,
      lastRender: 0,
      obstacles: []
    };

    gameObjectsRef.current.food = generateFood();
  }, [generateFood]);

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

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (!gameLoopRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameObjects = gameObjectsRef.current;

    // Control game speed
    if (currentTime - gameObjects.lastRender < gameObjects.gameSpeed) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    gameObjects.lastRender = currentTime;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_WIDTH; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * GRID_SIZE);
      ctx.stroke();
    }

    // Update snake direction
    gameObjects.direction = { ...gameObjects.nextDirection };

    // Move snake
    const head = { ...gameObjects.snake[0] };
    head.x += gameObjects.direction.x;
    head.y += gameObjects.direction.y;

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
      gameLoopRef.current = false;
      setGameState('gameOver');
      if (gameObjects.score > highScore) {
        setHighScore(gameObjects.score);
        try {
          localStorage?.setItem('snakeHighScore', gameObjects.score.toString());
        } catch {}
      }
      return;
    }

    // Check self collision
    if (gameObjects.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameLoopRef.current = false;
      setGameState('gameOver');
      if (gameObjects.score > highScore) {
        setHighScore(gameObjects.score);
        try {
          localStorage?.setItem('snakeHighScore', gameObjects.score.toString());
        } catch {}
      }
      return;
    }

    // Check obstacle collision
    if (gameObjects.obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
      gameLoopRef.current = false;
      setGameState('gameOver');
      if (gameObjects.score > highScore) {
        setHighScore(gameObjects.score);
        try {
          localStorage?.setItem('snakeHighScore', gameObjects.score.toString());
        } catch {}
      }
      return;
    }

    gameObjects.snake.unshift(head);

    // Check food collision
    let ate = false;
    if (gameObjects.food && head.x === gameObjects.food.x && head.y === gameObjects.food.y) {
      gameObjects.score += gameObjects.food.points;
      if (gameObjects.score < 0) gameObjects.score = 0; // Don't allow negative scores
      if (gameObjects.score > 25) gameObjects.score = 25; // Cap at 25
      
      setScore(gameObjects.score);
      onScore(gameObjects.score);
      ate = true;

      // Generate new obstacles every few points
      if (gameObjects.score % 3 === 0 && gameObjects.score > 0) {
        gameObjects.obstacles = generateObstacles(gameObjects.score);
      }

      // Increase speed as score increases (makes it harder)
      gameObjects.gameSpeed = Math.max(80, 150 - gameObjects.score * 3);

      gameObjects.food = generateFood();
    }

    if (!ate) {
      gameObjects.snake.pop();
    }

    // Draw obstacles
    gameObjects.obstacles.forEach(obstacle => {
      const gradient = ctx.createRadialGradient(
        obstacle.x * GRID_SIZE + GRID_SIZE/2, 
        obstacle.y * GRID_SIZE + GRID_SIZE/2, 
        0,
        obstacle.x * GRID_SIZE + GRID_SIZE/2, 
        obstacle.y * GRID_SIZE + GRID_SIZE/2, 
        GRID_SIZE/2
      );
      gradient.addColorStop(0, '#dc2626');
      gradient.addColorStop(1, '#991b1b');
      ctx.fillStyle = gradient;
      ctx.fillRect(
        obstacle.x * GRID_SIZE + 1, 
        obstacle.y * GRID_SIZE + 1, 
        GRID_SIZE - 2, 
        GRID_SIZE - 2
      );
      
      // Add glow effect
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 10;
      ctx.fillRect(
        obstacle.x * GRID_SIZE + 1, 
        obstacle.y * GRID_SIZE + 1, 
        GRID_SIZE - 2, 
        GRID_SIZE - 2
      );
      ctx.shadowBlur = 0;
    });

    // Draw food
    if (gameObjects.food) {
      const food = gameObjects.food;
      let foodColor = '#10b981'; // Normal food - green
      let glowColor = '#10b981';
      
      if (food.type === 'special') {
        foodColor = '#f59e0b'; // Special food - yellow
        glowColor = '#f59e0b';
      } else if (food.type === 'poison') {
        foodColor = '#ef4444'; // Poison food - red
        glowColor = '#ef4444';
      }

      // Food glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      
      const foodGradient = ctx.createRadialGradient(
        food.x * GRID_SIZE + GRID_SIZE/2, 
        food.y * GRID_SIZE + GRID_SIZE/2, 
        0,
        food.x * GRID_SIZE + GRID_SIZE/2, 
        food.y * GRID_SIZE + GRID_SIZE/2, 
        GRID_SIZE/2
      );
      foodGradient.addColorStop(0, foodColor);
      foodGradient.addColorStop(1, foodColor + '80');
      ctx.fillStyle = foodGradient;
      
      ctx.beginPath();
      ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE/2, 
        food.y * GRID_SIZE + GRID_SIZE/2, 
        GRID_SIZE/2 - 2, 
        0, 
        2 * Math.PI
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Food type indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      const text = food.type === 'special' ? '★' : food.type === 'poison' ? '☠' : '●';
      ctx.fillText(
        text, 
        food.x * GRID_SIZE + GRID_SIZE/2, 
        food.y * GRID_SIZE + GRID_SIZE/2 + 4
      );
    }

    // Draw snake
    gameObjects.snake.forEach((segment, index) => {
      let segmentColor = index === 0 ? '#22c55e' : '#16a34a'; // Head brighter
      
      // Create gradient for snake segments
      const segmentGradient = ctx.createLinearGradient(
        segment.x * GRID_SIZE, 
        segment.y * GRID_SIZE, 
        segment.x * GRID_SIZE + GRID_SIZE, 
        segment.y * GRID_SIZE + GRID_SIZE
      );
      segmentGradient.addColorStop(0, segmentColor);
      segmentGradient.addColorStop(1, index === 0 ? '#15803d' : '#166534');
      
      ctx.fillStyle = segmentGradient;
      ctx.fillRect(
        segment.x * GRID_SIZE + 1, 
        segment.y * GRID_SIZE + 1, 
        GRID_SIZE - 2, 
        GRID_SIZE - 2
      );

      // Snake head details
      if (index === 0) {
        ctx.fillStyle = '#ffffff';
        // Eyes
        ctx.fillRect(segment.x * GRID_SIZE + 5, segment.y * GRID_SIZE + 5, 3, 3);
        ctx.fillRect(segment.x * GRID_SIZE + 12, segment.y * GRID_SIZE + 5, 3, 3);
      }
    });

    // Draw score and info with shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`Score: ${gameObjects.score}`, 22, 42);
    ctx.fillText(`High: ${highScore}`, 22, 72);
    ctx.fillText(`Speed: ${(160 - gameObjects.gameSpeed).toFixed(0)}`, 22, 102);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Score: ${gameObjects.score}`, 20, 40);
    ctx.fillText(`High: ${highScore}`, 20, 70);
    ctx.fillText(`Speed: ${(160 - gameObjects.gameSpeed).toFixed(0)}`, 20, 100);

    // Draw difficulty indicator
    const difficultyText = gameObjects.score < 5 ? 'Easy' : 
                          gameObjects.score < 10 ? 'Medium' : 
                          gameObjects.score < 15 ? 'Hard' : 'Expert';
    const difficultyColor = gameObjects.score < 5 ? '#10b981' : 
                           gameObjects.score < 10 ? '#f59e0b' : 
                           gameObjects.score < 15 ? '#ef4444' : '#8b5cf6';
    
    ctx.fillStyle = difficultyColor;
    ctx.font = '16px monospace';
    ctx.fillText(difficultyText, CANVAS_WIDTH - 100, 30);

    if (gameLoopRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [highScore, onScore, generateFood, generateObstacles]);

  // Start game loop when playing
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = true;
      animationRef.current = requestAnimationFrame(gameLoop);
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

  const changeDirection = useCallback((newDirection: Position) => {
    if (gameState === 'playing') {
      const gameObjects = gameObjectsRef.current;
      // Prevent reverse direction
      if (newDirection.x === -gameObjects.direction.x && newDirection.y === -gameObjects.direction.y) {
        return;
      }
      gameObjects.nextDirection = newDirection;
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
      e.preventDefault();
      
      if (gameState === 'idle' && e.code === 'Space') {
        startGame();
      } else if (gameState === 'playing') {
        switch (e.code) {
          case 'ArrowUp':
          case 'KeyW':
            changeDirection({ x: 0, y: -1 });
            break;
          case 'ArrowDown':
          case 'KeyS':
            changeDirection({ x: 0, y: 1 });
            break;
          case 'ArrowLeft':
          case 'KeyA':
            changeDirection({ x: -1, y: 0 });
            break;
          case 'ArrowRight':
          case 'KeyD':
            changeDirection({ x: 1, y: 0 });
            break;
        }
      } else if (gameState === 'gameOver' && e.code === 'Space') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, startGame, changeDirection, resetGame]);

  const isScoreClaimed = claimedScores.has(score);
  const canClaimNFT = gameState === 'gameOver' && score > 0 && !isScoreClaimed && walletConnected;

  return (
    <div className="max-w-6xl mx-auto p-4 bg-black text-white min-h-screen">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent leading-normal">
          Viper's Quest
        </h2>
        
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Guide the mystical serpent through an ever-changing maze. Collect treasures, avoid obstacles, and achieve unique scores to claim exclusive NFTs.
          Each quest costs <span className="text-white font-semibold">1 DT token</span> — make your journey legendary!
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
              className="border-2 border-gray-600 rounded-lg shadow-lg"
            />
            
            {/* Game Overlays */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
                <div className="text-center">
                  <h3 className="text-4xl font-bold mb-6 text-green-400">Ready to Slither?</h3>
                  
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
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:scale-105'
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
                        <span>Begin Quest</span>
                      </>
                    )}
                  </button>
                  
                  {walletConnected && hasEnoughTokens && (
                    <div className="mt-6 space-y-3 text-gray-300">
                      <p className="text-lg font-semibold">🎮 Controls:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm max-w-sm mx-auto">
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">↑ W</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">↓ S</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">← A</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">→ D</kbd>
                      </div>
                      <p className="text-sm text-gray-400">Use arrow keys or WASD to move!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {gameState === 'gameOver' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-lg backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">🐍</div>
                  <h3 className="text-4xl font-bold mb-3 text-red-400">Quest Complete!</h3>
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
                      <span>New Quest (1 DT)</span>
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
                  
                  <p className="text-gray-400 text-sm mt-6">Press SPACE to start a new quest</p>
                </div>
              </div>
            )}
          </div>

          {/* Game Stats & Info */}
          <div className="space-y-6 w-full xl:w-80">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-2xl font-bold mb-4 flex items-center text-yellow-400">
                <Award className="h-6 w-6 mr-3" />
                Serpent Stats
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Current Score:</span>
                  <span className="font-mono text-2xl font-bold text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Best Quest:</span>
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
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((score / 25) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 text-center">Progress to maximum score</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-xl p-6 border border-yellow-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-yellow-300">💰 Game Economy</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Cost per Quest:</span>
                  <span className="text-yellow-400 font-bold">{GAME_COST_DT} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Your Balance:</span>
                  <span className="text-green-400 font-bold">{parseFloat(dtTokenBalance).toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Quests Available:</span>
                  <span className="text-blue-400 font-bold">{Math.floor(parseFloat(dtTokenBalance) / GAME_COST_DT)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-yellow-400/30">
                <p className="text-xs text-yellow-200 font-medium">
                  🎯 Each quest costs 1 DT token. Tokens are deducted when you start playing!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-green-400">🎮 Serpent Controls</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center space-y-2">
                    <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">↑ W</kbd>
                    <span className="text-gray-300 text-xs">Up</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">↓ S</kbd>
                    <span className="text-gray-300 text-xs">Down</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">← A</kbd>
                    <span className="text-gray-300 text-xs">Left</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">→ D</kbd>
                    <span className="text-gray-300 text-xs">Right</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-emerald-400">🏆 Quest Rules</h4>
              <ul className="text-sm text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">●</span>
                  Collect green orbs to grow and score
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">★</span>
                  Golden orbs give bonus points (+2)
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">☠</span>
                  Avoid poison orbs (lose points)
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">■</span>
                  Red obstacles appear as you progress
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">⚡</span>
                  Speed increases with your score
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">🚫</span>
                  Don't hit walls or yourself!
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
                  <span className="text-gray-300">Scores 11-15:</span>
                  <span className="text-blue-400 font-semibold">🔵 Rare</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 16-20:</span>
                  <span className="text-purple-400 font-semibold">🟣 Epic</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 21-25:</span>
                  <span className="text-yellow-400 font-semibold">⭐ Legendary</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-purple-400/30">
                <p className="text-xs text-purple-200 font-medium">
                  🎯 Each score can only be claimed ONCE across all serpent masters!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-xl p-6 border border-red-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-red-300">⚠️ Difficulty Scaling</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 0-4:</span>
                  <span className="text-green-400 font-semibold">🟢 Easy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 5-9:</span>
                  <span className="text-yellow-400 font-semibold">🟡 Medium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 10-14:</span>
                  <span className="text-orange-400 font-semibold">🟠 Hard</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 15+:</span>
                  <span className="text-red-400 font-semibold">🔴 Expert</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-red-400/30">
                <p className="text-xs text-red-200 font-medium">
                  🚨 Higher scores bring faster speeds, more obstacles, and poison food!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/50 to-cyan-900/50 rounded-xl p-6 border border-indigo-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-indigo-300">🎲 Food Types</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 text-lg">●</span>
                    <span className="text-gray-300">Normal Food</span>
                  </div>
                  <span className="text-green-400 font-semibold">+1 Point</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 text-lg">★</span>
                    <span className="text-gray-300">Special Food</span>
                  </div>
                  <span className="text-yellow-400 font-semibold">+2 Points</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400 text-lg">☠</span>
                    <span className="text-gray-300">Poison Food</span>
                  </div>
                  <span className="text-red-400 font-semibold">-2 Points</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-indigo-400/30">
                <p className="text-xs text-indigo-200 font-medium">
                  💡 Special and poison foods appear after score 10!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGameComponent;