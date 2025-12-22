import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, CoinSide, CoinState } from './types';
import { 
  VALUE_LEVELS, SPEED_LEVELS_MS, ODDS_LEVELS, AUTO_LEVELS_MS, 
  COUNT_LEVELS, CRIT_LEVELS, UPGRADES, PARAGON_MULTIPLIER_PER_POINT, PRESTIGE_REQ 
} from './constants';
import { playFlipSound, playWinSound, playUpgradeSound, playPrestigeSound } from './services/audioService';
import Coin from './components/Coin';
import UpgradeShop from './components/UpgradeShop';
import Guru from './components/Guru';

const App: React.FC = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>({
    money: 0,
    totalFlips: 0,
    totalHeads: 0,
    paragonPoints: 0,
    upgrades: {
      value: 0, // Index 0 = $0.10
      speed: 0, // Index 0 = 2s
      odds: 0,  // Index 0 = 50%
      auto: -1, // -1 = None. Index 0 = 1s
      count: -1, // -1 = 1 coin. Index 0 = 2 coins
      crit: -1, // -1 = 0%. Index 0 = 10%
    },
  });

  // Manage multiple coins
  const [coins, setCoins] = useState<CoinState[]>([
    { id: 0, side: CoinSide.HEADS, isFlipping: false, lastWin: null, isCrit: false }
  ]);

  // --- Derived Values ---
  
  // Value
  const baseValue = VALUE_LEVELS[gameState.upgrades.value] || VALUE_LEVELS[0];
  const prestigeMultiplier = 1 + (gameState.paragonPoints * PARAGON_MULTIPLIER_PER_POINT);
  const currentValue = baseValue * prestigeMultiplier;

  // Speed
  const currentSpeed = SPEED_LEVELS_MS[gameState.upgrades.speed] || 2000;

  // Odds
  const currentOdds = ODDS_LEVELS[gameState.upgrades.odds] || 0.5;

  // Auto Interval
  const currentAutoInterval = gameState.upgrades.auto >= 0 
    ? AUTO_LEVELS_MS[gameState.upgrades.auto] 
    : null;

  // Max Coins
  const maxCoins = gameState.upgrades.count >= 0 
    ? COUNT_LEVELS[gameState.upgrades.count] 
    : 1;

  // Crit Chance
  const critChance = gameState.upgrades.crit >= 0 
    ? CRIT_LEVELS[gameState.upgrades.crit] 
    : 0;


  // --- Refs ---
  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);
  
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // --- Sync Coin Count ---
  useEffect(() => {
    setCoins(prev => {
      if (prev.length === maxCoins) return prev;
      if (prev.length < maxCoins) {
        // Add coins
        const newCoins = [...prev];
        for (let i = prev.length; i < maxCoins; i++) {
          newCoins.push({ id: i, side: CoinSide.HEADS, isFlipping: false, lastWin: null, isCrit: false });
        }
        return newCoins;
      } else {
        // Remove coins (shouldn't happen with upgrades only going up, but safe to have)
        return prev.slice(0, maxCoins);
      }
    });
  }, [maxCoins]);


  // --- Actions ---

  const handleFlip = useCallback((coinId: number) => {
    const coin = coinsRef.current.find(c => c.id === coinId);
    if (!coin || coin.isFlipping) return;

    // Play flip sound start
    playFlipSound();

    // Start Flip Animation
    setCoins(prev => prev.map(c => c.id === coinId ? { ...c, isFlipping: true, lastWin: null, isCrit: false } : c));

    // Determine Result Logic (Calculated now, revealed later)
    const isHeads = Math.random() < currentOdds;
    const isCrit = isHeads && (Math.random() < critChance);
    const payout = isHeads ? (currentValue * (isCrit ? 2 : 1)) : 0;
    const resultSide = isHeads ? CoinSide.HEADS : CoinSide.TAILS;

    // End Flip
    setTimeout(() => {
      
      // Sound effect for result
      if (isHeads) {
        playWinSound(isCrit);
      }

      // Update Game State
      setGameState(prev => ({
        ...prev,
        money: prev.money + payout,
        totalFlips: prev.totalFlips + 1,
        totalHeads: prev.totalHeads + (isHeads ? 1 : 0),
      }));

      // Update Coin State
      setCoins(prev => prev.map(c => c.id === coinId ? {
        ...c,
        isFlipping: false,
        side: resultSide,
        lastWin: isHeads ? payout : null,
        isCrit: isCrit
      } : c));

    }, currentSpeed);

  }, [currentOdds, critChance, currentValue, currentSpeed]);


  const buyUpgrade = (id: keyof GameState['upgrades']) => {
    const upgrade = UPGRADES.find(u => u.id === id);
    if (!upgrade) return;

    const currentLevelIndex = gameState.upgrades[id];
    const nextLevelIndex = currentLevelIndex + 1;
    
    if (nextLevelIndex >= upgrade.costs.length) return; // Maxed out

    const cost = upgrade.costs[nextLevelIndex];

    if (gameState.money >= cost) {
      playUpgradeSound();
      setGameState(prev => ({
        ...prev,
        money: prev.money - cost,
        upgrades: {
          ...prev.upgrades,
          [id]: prev.upgrades[id] + 1,
        }
      }));
    }
  };

  const handlePrestige = () => {
    const pointsToGain = Math.floor(Math.sqrt(gameState.money));
    if (pointsToGain === 0) return;

    if (window.confirm(`Are you sure you want to Ascend? You will lose all money and upgrades, but gain ${pointsToGain} Paragon Points giving a ${(pointsToGain * PARAGON_MULTIPLIER_PER_POINT * 100).toFixed(0)}% permanent bonus.`)) {
      playPrestigeSound();
      setGameState(prev => ({
        money: 0,
        totalFlips: 0,
        totalHeads: 0,
        paragonPoints: prev.paragonPoints + pointsToGain,
        upgrades: {
          value: 0,
          speed: 0,
          odds: 0,
          auto: -1,
          count: -1,
          crit: -1,
        }
      }));
      // Reset coins
      setCoins([{ id: 0, side: CoinSide.HEADS, isFlipping: false, lastWin: null, isCrit: false }]);
    }
  };


  // --- Auto Flip Effect ---
  useEffect(() => {
    if (!currentAutoInterval) return;

    const intervalId = setInterval(() => {
      // Find an idle coin
      const idleCoin = coinsRef.current.find(c => !c.isFlipping);
      if (idleCoin) {
        handleFlip(idleCoin.id);
      }
    }, currentAutoInterval);

    return () => clearInterval(intervalId);
  }, [currentAutoInterval, handleFlip]);


  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row overflow-hidden font-sans">
      
      {/* Left Panel: Game Area */}
      <div className="flex-1 p-4 md:p-6 flex flex-col items-center relative border-b lg:border-b-0 lg:border-r border-slate-700 h-[60vh] lg:h-screen overflow-hidden">
        
        {/* Header Stats */}
        <div className="w-full max-w-4xl mx-auto flex justify-between items-start mb-4 z-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
              Coin Flip Tycoon
            </h1>
            <div className="flex flex-col gap-1 mt-1">
                <p className="text-slate-400 text-xs">Flips: {gameState.totalFlips} | Heads: {gameState.totalHeads}</p>
                {gameState.paragonPoints > 0 && (
                    <p className="text-purple-400 text-xs font-bold">Paragon Bonus: +{(gameState.paragonPoints * PARAGON_MULTIPLIER_PER_POINT * 100).toFixed(0)}%</p>
                )}
            </div>
          </div>
          <div className="text-right">
             <div className="text-3xl md:text-5xl font-mono font-bold text-emerald-400 drop-shadow-lg">
              ${gameState.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Coins Container */}
        <div className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-y-auto">
            <div className={`grid gap-4 md:gap-8 transition-all duration-300 ${
                coins.length === 1 ? 'grid-cols-1' :
                coins.length <= 4 ? 'grid-cols-2' :
                coins.length <= 6 ? 'grid-cols-3' :
                coins.length <= 8 ? 'grid-cols-4' :
                'grid-cols-4 md:grid-cols-5'
            }`}>
            {coins.map((coin) => (
                <div key={coin.id} className="relative flex justify-center">
                    <Coin 
                        side={coin.side} 
                        isFlipping={coin.isFlipping}
                        isCrit={coin.isCrit}
                        duration={currentSpeed} 
                        onClick={() => handleFlip(coin.id)} 
                        size={coins.length > 4 ? 'small' : 'normal'}
                    />
                    
                    {/* Floating Text per coin */}
                    {coin.lastWin !== null && !coin.isFlipping && (
                        <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 animate-bounce font-bold pointer-events-none whitespace-nowrap z-20 ${coin.isCrit ? 'text-purple-400 text-2xl md:text-3xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-emerald-400 text-xl md:text-2xl'}`}>
                        {coin.isCrit ? 'CRIT! ' : ''}+${coin.lastWin.toFixed(2)}
                        </div>
                    )}
                </div>
            ))}
            </div>
        </div>

        {/* Current Stats Footer */}
        <div className="w-full max-w-2xl grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs md:text-sm mt-4">
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 uppercase tracking-wider">Value</p>
                <p className="font-mono text-yellow-400">${currentValue.toFixed(2)}</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 uppercase tracking-wider">Speed</p>
                <p className="font-mono text-blue-400">{(currentSpeed/1000).toFixed(2)}s</p>
            </div>
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 uppercase tracking-wider">Odds</p>
                <p className="font-mono text-pink-400">{(currentOdds * 100).toFixed(0)}%</p>
            </div>
             <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 uppercase tracking-wider">Auto</p>
                <p className="font-mono text-orange-400">{currentAutoInterval ? `${(currentAutoInterval/1000).toFixed(2)}s` : 'OFF'}</p>
            </div>
        </div>
        
        {/* Guru Section */}
        <div className="w-full max-w-2xl mt-4 hidden md:block">
            <Guru gameState={gameState} />
        </div>

      </div>

      {/* Right Panel: Shop */}
      <div className="w-full lg:w-[420px] bg-slate-800 lg:bg-slate-900 border-t lg:border-t-0 border-slate-700 p-4 flex flex-col h-[40vh] lg:h-screen z-20 shadow-2xl">
        <UpgradeShop 
            gameState={gameState} 
            onBuyUpgrade={buyUpgrade} 
            onPrestige={handlePrestige}
        />
        {/* Mobile Guru */}
        <div className="block md:hidden mt-4">
             <Guru gameState={gameState} />
        </div>
      </div>

    </div>
  );
};

export default App;