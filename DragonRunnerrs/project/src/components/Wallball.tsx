import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Award, Coins } from 'lucide-react';
import { ethers } from 'ethers';
import DtokenAbi from "../ContractAbi/Dtoken.json";
import toast from 'react-hot-toast';

interface BallPaddleGameProps {
  onScore?: (score: number) => void;
  onClaimNFT?: (score: number) => void;
  claimedScores?: Set<number>;
  walletConnected?: boolean;
  dtTokenBalance: string;
  onRefreshTokenBalance: () => void;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Ball Paddle Token Contract ABI
const DT_CONTRACT_ABI = DtokenAbi;

// Replace with your actual Dragon Token contract address
const DT_CONTRACT_ADDRESS = "0x079Fe31EE22088a6B9cB2615D8e6AB9DFb3A75a5";

const BallPaddleGame: React.FC<BallPaddleGameProps> = ({ 
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
  const mouseXRef = useRef<number>(0);
  const gameObjectsRef = useRef({
    ball: { x: 0, y: 0, dx: 0, dy: 0, radius: 0 } as Ball,
    paddle: { x: 0, y: 0, width: 0, height: 0 } as Paddle,
    score: 0,
    gameSpeed: 1,
    lastRender: 0,
    keys: { left: false, right: false }
  });
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [isPayingForGame, setIsPayingForGame] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage?.getItem('ballPaddleHighScore');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const BALL_RADIUS = 12;
  const PADDLE_WIDTH = 120;
  const PADDLE_HEIGHT = 15;
  const GAME_COST_DT = 1; // Cost to play one game
  const BASE_BALL_SPEED = 5;
  const PADDLE_SPEED = 8;

  // Check if player has enough tokens to play
  const hasEnoughTokens = parseFloat(dtTokenBalance) >= GAME_COST_DT;

  // Initialize game objects
  const initializeGame = useCallback(() => {
    const ball: Ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      dx: (Math.random() > 0.5 ? 1 : -1) * BASE_BALL_SPEED * (0.7 + Math.random() * 0.6),
      dy: BASE_BALL_SPEED * (0.7 + Math.random() * 0.6),
      radius: BALL_RADIUS
    };

    const paddle: Paddle = {
      x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      y: CANVAS_HEIGHT - 40,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    };

    gameObjectsRef.current = {
      ball,
      paddle,
      score: 0,
      gameSpeed: 1,
      lastRender: 0,
      keys: { left: false, right: false }
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

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (!gameLoopRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameObjects = gameObjectsRef.current;

    // Control game speed (60 FPS)
    if (currentTime - gameObjects.lastRender < 16.67) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    gameObjects.lastRender = currentTime;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw boundary lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    // Top
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CANVAS_WIDTH, 0);
    ctx.stroke();
    // Left
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH, 0);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Update paddle position (keyboard controls)
    if (gameObjects.keys.left && gameObjects.paddle.x > 0) {
      gameObjects.paddle.x -= PADDLE_SPEED;
    }
    if (gameObjects.keys.right && gameObjects.paddle.x < CANVAS_WIDTH - gameObjects.paddle.width) {
      gameObjects.paddle.x += PADDLE_SPEED;
    }

    // Mouse control for paddle
    gameObjects.paddle.x = mouseXRef.current - gameObjects.paddle.width / 2;
    gameObjects.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - gameObjects.paddle.width, gameObjects.paddle.x));

    // Update ball position
    gameObjects.ball.x += gameObjects.ball.dx;
    gameObjects.ball.y += gameObjects.ball.dy;

    // Ball collision with walls
    // Top wall
    if (gameObjects.ball.y - gameObjects.ball.radius <= 0) {
      gameObjects.ball.y = gameObjects.ball.radius;
      gameObjects.ball.dy = -gameObjects.ball.dy;
    }

    // Left wall
    if (gameObjects.ball.x - gameObjects.ball.radius <= 0) {
      gameObjects.ball.x = gameObjects.ball.radius;
      gameObjects.ball.dx = -gameObjects.ball.dx;
    }

    // Right wall
    if (gameObjects.ball.x + gameObjects.ball.radius >= CANVAS_WIDTH) {
      gameObjects.ball.x = CANVAS_WIDTH - gameObjects.ball.radius;
      gameObjects.ball.dx = -gameObjects.ball.dx;
    }

    // Ball collision with paddle
    if (
      gameObjects.ball.x >= gameObjects.paddle.x &&
      gameObjects.ball.x <= gameObjects.paddle.x + gameObjects.paddle.width &&
      gameObjects.ball.y + gameObjects.ball.radius >= gameObjects.paddle.y &&
      gameObjects.ball.y - gameObjects.ball.radius <= gameObjects.paddle.y + gameObjects.paddle.height &&
      gameObjects.ball.dy > 0
    ) {
      // Calculate hit position on paddle (for angle variation)
      const hitPos = (gameObjects.ball.x - gameObjects.paddle.x) / gameObjects.paddle.width;
      const angle = (hitPos - 0.5) * Math.PI * 0.5; // -45° to +45°
      
      const speed = Math.sqrt(gameObjects.ball.dx * gameObjects.ball.dx + gameObjects.ball.dy * gameObjects.ball.dy);
      const newSpeed = Math.min(speed + 0.2, BASE_BALL_SPEED * 2.5); // Gradually increase speed, cap at 2.5x
      
      gameObjects.ball.dx = newSpeed * Math.sin(angle);
      gameObjects.ball.dy = -newSpeed * Math.cos(angle);
      
      // Ensure minimum upward velocity
      if (Math.abs(gameObjects.ball.dy) < 2) {
        gameObjects.ball.dy = gameObjects.ball.dy > 0 ? 2 : -2;
      }

      // Update score
      gameObjects.score++;
      setScore(gameObjects.score);
      onScore(gameObjects.score);

      // Cap score at 20 to make it challenging
      if (gameObjects.score >= 20) {
        gameObjects.score = 20;
        setScore(20);
      }
    }

    // Game over if ball falls below paddle
    if (gameObjects.ball.y - gameObjects.ball.radius > CANVAS_HEIGHT) {
      gameLoopRef.current = false;
      setGameState('gameOver');
      if (gameObjects.score > highScore) {
        setHighScore(gameObjects.score);
        try {
          localStorage?.setItem('ballPaddleHighScore', gameObjects.score.toString());
        } catch {}
      }
      return;
    }

    // Draw paddle with gradient
    const paddleGradient = ctx.createLinearGradient(
      gameObjects.paddle.x, 
      gameObjects.paddle.y, 
      gameObjects.paddle.x, 
      gameObjects.paddle.y + gameObjects.paddle.height
    );
    paddleGradient.addColorStop(0, '#4ade80');
    paddleGradient.addColorStop(1, '#16a34a');
    
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(
      gameObjects.paddle.x, 
      gameObjects.paddle.y, 
      gameObjects.paddle.width, 
      gameObjects.paddle.height
    );
    
    // Paddle glow effect
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 15;
    ctx.fillRect(
      gameObjects.paddle.x, 
      gameObjects.paddle.y, 
      gameObjects.paddle.width, 
      gameObjects.paddle.height
    );
    ctx.shadowBlur = 0;

    // Draw ball with gradient and glow
    const ballGradient = ctx.createRadialGradient(
      gameObjects.ball.x - 3, 
      gameObjects.ball.y - 3, 
      0,
      gameObjects.ball.x, 
      gameObjects.ball.y, 
      gameObjects.ball.radius
    );
    ballGradient.addColorStop(0, '#60a5fa');
    ballGradient.addColorStop(1, '#1d4ed8');
    
    ctx.fillStyle = ballGradient;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 20;
    
    ctx.beginPath();
    ctx.arc(gameObjects.ball.x, gameObjects.ball.y, gameObjects.ball.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ball trail effect
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#60a5fa';
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(
        gameObjects.ball.x - gameObjects.ball.dx * i * 0.3, 
        gameObjects.ball.y - gameObjects.ball.dy * i * 0.3, 
        gameObjects.ball.radius * (0.8 - i * 0.2), 
        0, 
        2 * Math.PI
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw score with shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${gameObjects.score}`, CANVAS_WIDTH / 2 + 2, 52);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Score: ${gameObjects.score}`, CANVAS_WIDTH / 2, 50);

    // Speed indicator
    const currentSpeed = Math.sqrt(gameObjects.ball.dx * gameObjects.ball.dx + gameObjects.ball.dy * gameObjects.ball.dy);
    const speedText = `Speed: ${currentSpeed.toFixed(1)}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(speedText, 22, 92);
    
    ctx.fillStyle = '#10b981';
    ctx.fillText(speedText, 20, 90);

    // Draw difficulty indicator
    const difficultyText = gameObjects.score < 5 ? 'Easy' : 
                          gameObjects.score < 10 ? 'Medium' : 
                          gameObjects.score < 15 ? 'Hard' : 'Expert';
    const difficultyColor = gameObjects.score < 5 ? '#10b981' : 
                           gameObjects.score < 10 ? '#f59e0b' : 
                           gameObjects.score < 15 ? '#ef4444' : '#8b5cf6';
    
    ctx.fillStyle = difficultyColor;
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(difficultyText, CANVAS_WIDTH - 20, 90);

    if (gameLoopRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [highScore, onScore]);

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

  // Mouse controls
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState === 'playing') {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          mouseXRef.current = e.clientX - rect.left;
        }
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      if (gameState === 'idle' && e.code === 'Space') {
        startGame();
      } else if (gameState === 'playing') {
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            gameObjectsRef.current.keys.left = true;
            break;
          case 'ArrowRight':
          case 'KeyD':
            gameObjectsRef.current.keys.right = true;
            break;
        }
      } else if (gameState === 'gameOver' && e.code === 'Space') {
        resetGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          gameObjectsRef.current.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          gameObjectsRef.current.keys.right = false;
          break;
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
  const canClaimNFT = gameState === 'gameOver' && score > 0 && !isScoreClaimed && walletConnected;

  return (
    <div className="max-w-6xl mx-auto p-4 bg-black text-white min-h-screen">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-normal">
          Paddle Master
        </h2>
        
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Control your paddle to keep the ball bouncing! Each bounce scores a point, but the ball gets faster with every hit.
          Can you reach the legendary score of 20? Each game costs <span className="text-white font-semibold">1 DT token</span>!
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
              className="border-2 border-gray-600 rounded-lg shadow-lg cursor-none"
            />
            
            {/* Game Overlays */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
                <div className="text-center">
                  <h3 className="text-4xl font-bold mb-6 text-blue-400">Ready to Bounce?</h3>
                  
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
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 hover:scale-105'
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
                        <span>Start Bouncing</span>
                      </>
                    )}
                  </button>
                  
                  {walletConnected && hasEnoughTokens && (
                    <div className="mt-6 space-y-3 text-gray-300">
                      <p className="text-lg font-semibold">🎮 Controls:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm max-w-sm mx-auto">
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">← A</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md">→ D</kbd>
                        <kbd className="px-3 py-2 bg-gray-700 rounded-md col-span-2">Mouse Move</kbd>
                      </div>
                      <p className="text-sm text-gray-400">Use arrow keys, A/D, or mouse to control paddle!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {gameState === 'gameOver' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-lg backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <div className="text-5xl mb-4">🏓</div>
                  <h3 className="text-4xl font-bold mb-3 text-red-400">Game Over!</h3>
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
                      <span>New Game (1 DT)</span>
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
                  
                  <p className="text-gray-400 text-sm mt-6">Press SPACE to start a new game</p>
                </div>
              </div>
            )}
          </div>

          {/* Game Stats & Info */}
          <div className="space-y-6 w-full xl:w-80">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-2xl font-bold mb-4 flex items-center text-yellow-400">
                <Award className="h-6 w-6 mr-3" />
                Paddle Stats
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Current Score:</span>
                  <span className="font-mono text-2xl font-bold text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Best Score:</span>
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
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((score / 20) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 text-center">Progress to legendary score (20)</p>
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
              <h4 className="text-xl font-bold mb-4 text-blue-400">🎮 Paddle Controls</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center space-y-2">
                    <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">← A</kbd>
                    <span className="text-gray-300 text-xs">Move Left</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <kbd className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">→ D</kbd>
                    <span className="text-gray-300 text-xs">Move Right</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-sm font-mono border border-gray-500">🖱️ Mouse</div>
                    <span className="text-gray-300 text-xs">Follow Mouse</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-600 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-emerald-400">🏆 Game Rules</h4>
              <ul className="text-sm text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">⚽</span>
                  Ball bounces off top, left, and right walls
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">🏓</span>
                  Hit the ball with your paddle to score
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">⚡</span>
                  Ball speed increases with each hit
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">📐</span>
                  Hit position affects bounce angle
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">💥</span>
                  Game ends if ball falls below paddle
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">🎯</span>
                  Maximum possible score: 20 points
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-purple-300">💎 NFT Rewards</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 1-5:</span>
                  <span className="text-gray-400 font-semibold">⚪ Common</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 6-10:</span>
                  <span className="text-blue-400 font-semibold">🔵 Rare</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 11-15:</span>
                  <span className="text-purple-400 font-semibold">🟣 Epic</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Scores 16-20:</span>
                  <span className="text-yellow-400 font-semibold">⭐ Legendary</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-purple-400/30">
                <p className="text-xs text-purple-200 font-medium">
                  🎯 Each score can only be claimed ONCE across all paddle masters!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-xl p-6 border border-red-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-red-300">⚠️ Difficulty Scaling</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 1-5:</span>
                  <span className="text-green-400 font-semibold">🟢 Easy</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 6-10:</span>
                  <span className="text-yellow-400 font-semibold">🟡 Medium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 11-15:</span>
                  <span className="text-orange-400 font-semibold">🟠 Hard</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Score 16-20:</span>
                  <span className="text-red-400 font-semibold">🔴 Expert</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-red-400/30">
                <p className="text-xs text-red-200 font-medium">
                  🚨 Ball speed increases with every paddle hit - reaching 20 is nearly impossible!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/50 to-cyan-900/50 rounded-xl p-6 border border-indigo-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-indigo-300">🎯 Pro Tips</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <span className="text-cyan-400 mr-2">💡</span>
                  <span className="text-gray-300">Hit the ball with paddle edges for sharper angles</span>
                </div>
                <div className="flex items-start">
                  <span className="text-cyan-400 mr-2">💡</span>
                  <span className="text-gray-300">Mouse control offers more precision than keyboard</span>
                </div>
                <div className="flex items-start">
                  <span className="text-cyan-400 mr-2">💡</span>
                  <span className="text-gray-300">Ball speed caps at 2.5x for playability</span>
                </div>
                <div className="flex items-start">
                  <span className="text-cyan-400 mr-2">💡</span>
                  <span className="text-gray-300">Center hits keep the ball more predictable</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-indigo-400/30">
                <p className="text-xs text-indigo-200 font-medium">
                  🏆 The legendary score of 20 has been achieved by less than 1% of players!
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/50 to-teal-900/50 rounded-xl p-6 border border-green-500/50 shadow-lg">
              <h4 className="text-xl font-bold mb-4 text-green-300">⚡ Physics Engine</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Base Speed:</span>
                  <span className="text-green-400 font-semibold">{BASE_BALL_SPEED} px/frame</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Max Speed:</span>
                  <span className="text-red-400 font-semibold">{BASE_BALL_SPEED * 2.5} px/frame</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Paddle Size:</span>
                  <span className="text-blue-400 font-semibold">{PADDLE_WIDTH}x{PADDLE_HEIGHT} px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Ball Radius:</span>
                  <span className="text-purple-400 font-semibold">{BALL_RADIUS} px</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-green-400/30">
                <p className="text-xs text-green-200 font-medium">
                  ⚙️ Realistic physics with angle-based bouncing and speed acceleration!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BallPaddleGame;