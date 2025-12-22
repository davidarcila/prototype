import React, { useState, useEffect, useRef } from 'react';
import { GameState, UpgradeConfig } from '../types';
import { UPGRADES, PARAGON_MULTIPLIER_PER_POINT, PRESTIGE_REQ } from '../constants';

interface UpgradeShopProps {
  gameState: GameState;
  onBuyUpgrade: (id: keyof GameState['upgrades']) => void;
  onPrestige: () => void;
}

const UpgradeShop: React.FC<UpgradeShopProps> = ({ gameState, onBuyUpgrade, onPrestige }) => {
  
  // Calculate potential prestige points
  const potentialPoints = Math.floor(Math.sqrt(gameState.money));
  const canPrestige = gameState.money >= PRESTIGE_REQ;

  // Track purchased upgrades for animation
  const [purchasedId, setPurchasedId] = useState<string | null>(null);
  const prevUpgradesRef = useRef(gameState.upgrades);

  useEffect(() => {
    const current = gameState.upgrades;
    const prev = prevUpgradesRef.current;
    
    const changedKey = (Object.keys(current) as Array<keyof typeof current>).find(
        key => current[key] > prev[key]
    );

    if (changedKey) {
        setPurchasedId(changedKey);
        const timer = setTimeout(() => setPurchasedId(null), 600);
        return () => clearTimeout(timer);
    }
    
    prevUpgradesRef.current = current;
  }, [gameState.upgrades]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 sticky top-0 bg-slate-900/95 p-2 z-10 backdrop-blur-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Upgrades
        </h2>
        
        <div className="grid grid-cols-1 gap-3 pb-4">
          {UPGRADES.map((upgrade) => {
            const currentLevelIndex = gameState.upgrades[upgrade.id];
            const nextLevelIndex = currentLevelIndex + 1;
            const isMaxed = nextLevelIndex >= upgrade.costs.length;
            
            const cost = isMaxed ? 0 : upgrade.costs[nextLevelIndex];
            const canAfford = gameState.money >= cost;
            const displayLevel = currentLevelIndex + 1;
            const maxLevel = upgrade.costs.length;

            const isJustPurchased = purchasedId === upgrade.id;

            return (
              <div 
                key={upgrade.id}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  isJustPurchased
                    ? 'border-emerald-400 bg-emerald-900/30 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-[1.02]'
                    : isMaxed 
                        ? 'border-slate-600 bg-slate-800 opacity-60'
                        : canAfford 
                            ? 'border-emerald-500/50 bg-slate-800 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-900/20 cursor-pointer active:scale-95' 
                            : 'border-slate-700 bg-slate-800/50 opacity-80 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canAfford && !isMaxed) onBuyUpgrade(upgrade.id);
                }}
              >
                {/* Success Flash Overlay */}
                <div className={`absolute inset-0 bg-emerald-400/20 pointer-events-none transition-opacity duration-500 ${isJustPurchased ? 'opacity-100' : 'opacity-0'}`} />

                <div className="flex justify-between items-start mb-1 relative z-10">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                        {upgrade.name}
                        {isJustPurchased && (
                            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded animate-bounce">
                                LEVEL UP!
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-emerald-400 font-mono">
                       {isMaxed ? 'MAXED' : `Lvl ${displayLevel} / ${maxLevel}`}
                    </p>
                  </div>
                  {!isMaxed && (
                    <div className={`px-2 py-1 rounded-md text-sm font-mono font-bold transition-colors duration-300 ${
                      isJustPurchased ? 'bg-white text-emerald-600' : 
                      canAfford ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-400'
                    }`}>
                      ${cost.toLocaleString()}
                    </div>
                  )}
                </div>
                
                <p className="text-slate-400 text-xs mb-2 leading-tight relative z-10">{upgrade.description}</p>
                
                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden relative z-10">
                  <div 
                    className={`h-full transition-all duration-500 ${isJustPurchased ? 'bg-white shadow-[0_0_10px_white]' : 'bg-emerald-500'}`}
                    style={{ width: `${(displayLevel / maxLevel) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paragon / Prestige Section */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className={`rounded-xl p-4 border-2 transition-all ${
            canPrestige 
                ? 'bg-purple-900/40 border-purple-500 hover:bg-purple-900/60 cursor-pointer' 
                : 'bg-slate-800/50 border-slate-700 opacity-60 cursor-not-allowed'
        }`}
        onClick={() => canPrestige && onPrestige()}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-purple-300 font-bold text-lg flex items-center gap-2">
                    <span>🔮</span> Paragon
                </h3>
                {gameState.paragonPoints > 0 && (
                     <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-500/50">
                        Total: {gameState.paragonPoints} pts
                     </span>
                )}
            </div>
            
            <p className="text-slate-400 text-xs mb-3">
                Reset your progress to earn <strong className="text-purple-400">Paragon Points</strong>. 
                Each point grants a <strong className="text-white">+{PARAGON_MULTIPLIER_PER_POINT * 100}%</strong> permanent cash multiplier.
            </p>

            <div className="flex justify-between items-center bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
                <span className="text-xs text-slate-500">Reward:</span>
                <span className={`font-mono font-bold ${canPrestige ? 'text-purple-400' : 'text-slate-600'}`}>
                    +{potentialPoints} Pts
                </span>
            </div>
            {!canPrestige && (
                <p className="text-[10px] text-slate-500 text-center mt-2">
                    Need ${PRESTIGE_REQ.toLocaleString()} to ascend
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeShop;