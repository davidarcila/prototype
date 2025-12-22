import React from 'react';
import { CoinSide } from '../types';

interface CoinProps {
  side: CoinSide;
  isFlipping: boolean;
  isCrit?: boolean;
  duration: number;
  onClick: () => void;
  size?: 'normal' | 'small';
}

const Coin: React.FC<CoinProps> = ({ side, isFlipping, isCrit, duration, onClick, size = 'normal' }) => {
  
  // Size classes
  const containerSize = size === 'normal' ? 'w-48 h-48 md:w-56 md:h-56' : 'w-24 h-24 md:w-32 md:h-32';
  const fontSize = size === 'normal' ? 'text-5xl' : 'text-2xl';
  const labelSize = size === 'normal' ? 'text-sm' : 'text-[10px]';

  // Rotation style (Inner Coin)
  const coinStyle = {
    transition: isFlipping ? `transform ${duration}ms cubic-bezier(0.4, 2, 0.55, 0.44)` : 'none',
    transform: isFlipping 
      ? (side === CoinSide.HEADS ? 'rotateX(1800deg)' : 'rotateX(1980deg)') 
      : (side === CoinSide.HEADS ? 'rotateX(0deg)' : 'rotateX(180deg)'),
  };

  // Jump animation style (Outer Container)
  const containerStyle = {
    animation: isFlipping ? `toss-jump ${duration}ms ease-in-out` : 'none',
  };

  // Critical Glow Effect
  const critClasses = isCrit && !isFlipping 
    ? "shadow-[0_0_40px_rgba(168,85,247,0.8)] ring-4 ring-purple-400/50 animate-pulse" 
    : "shadow-xl";

  return (
    <div 
      className={`relative ${containerSize} cursor-pointer group perspective-1000 select-none rounded-full transition-all duration-300 ${critClasses}`}
      onClick={onClick}
      style={containerStyle}
    >
      <div 
        className="w-full h-full transform-style-3d relative"
        style={coinStyle}
      >
        {/* Front (Heads) */}
        <div className="absolute w-full h-full rounded-full backface-hidden border-4 border-yellow-600 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 flex items-center justify-center overflow-hidden">
          {/* Shine Overlay for Crit */}
          {isCrit && !isFlipping && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] pointer-events-none" />
          )}
          <div className="w-[90%] h-[90%] rounded-full border-2 border-yellow-200/50 flex items-center justify-center flex-col shadow-inner bg-yellow-500">
            <span className={`${fontSize} font-bold text-yellow-100 drop-shadow-md`}>$</span>
            <span className={`${labelSize} font-bold text-yellow-900 mt-1 tracking-widest uppercase`}>Heads</span>
          </div>
        </div>

        {/* Back (Tails) - Rotated 180 on X axis */}
        <div className="absolute w-full h-full rounded-full backface-hidden rotate-x-180 border-4 border-slate-400 bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 flex items-center justify-center">
          <div className="w-[90%] h-[90%] rounded-full border-2 border-slate-200/30 flex items-center justify-center flex-col shadow-inner bg-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" className={`${size === 'normal' ? 'h-20 w-20' : 'h-10 w-10'} text-slate-800 opacity-60`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 9a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 2a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className={`${labelSize} font-bold text-slate-800 mt-1 tracking-widest uppercase`}>Tails</span>
          </div>
        </div>
      </div>
      
      {/* Click hint */}
      {!isFlipping && size === 'normal' && (
        <div className="absolute -bottom-10 left-0 right-0 text-center text-slate-500 text-xs animate-bounce opacity-50">
          Tap to Flip
        </div>
      )}

      {/* Crit Sparkle Particles (Simulated via Glow) */}
      {isCrit && !isFlipping && (
        <div className="absolute -inset-2 bg-purple-500/20 blur-xl rounded-full animate-pulse pointer-events-none" />
      )}
    </div>
  );
};

export default Coin;