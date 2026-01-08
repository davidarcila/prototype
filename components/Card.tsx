import React from 'react';
import { CardData, CardEffect, CardTheme } from '../types';
import { EFFECT_CONFIG } from '../constants';
import { Sword, Shield, Heart, Coins, Sparkles, Skull } from 'lucide-react';

interface CardProps {
  card: CardData;
  onClick: (card: CardData) => void;
  disabled: boolean;
  theme: CardTheme;
}

const Card: React.FC<CardProps> = ({ card, onClick, disabled, theme }) => {
  const config = EFFECT_CONFIG[card.effect];

  const renderIcon = () => {
    switch (card.effect) {
      case CardEffect.ATTACK_SMALL:
      case CardEffect.ATTACK_MEDIUM:
      case CardEffect.ATTACK_BIG:
        return <Sword className={card.effect === CardEffect.ATTACK_BIG ? "w-10 h-10" : "w-8 h-8"} />;
      case CardEffect.HEAL_SMALL:
      case CardEffect.HEAL_MEDIUM:
        return <Heart className="w-8 h-8" />;
      case CardEffect.SHIELD:
        return <Shield className="w-8 h-8" />;
      case CardEffect.COIN_SMALL:
      case CardEffect.COIN_MEDIUM:
        return <Coins className="w-8 h-8" />;
      default:
        return <Sparkles className="w-8 h-8" />;
    }
  };

  return (
    <div 
      className={`relative w-full aspect-[3/4] cursor-pointer perspective-1000 ${card.isMatched ? 'opacity-0 pointer-events-none transition-opacity duration-700' : 'opacity-100'}`}
      onClick={() => !disabled && !card.isFlipped && !card.isMatched && onClick(card)}
    >
      <div 
        className={`w-full h-full relative transform-style-3d transition-transform duration-500 ${card.isFlipped ? 'rotate-y-180' : ''} shadow-xl rounded-xl`}
      >
        {/* Back of Card (Face Down) - Themed */}
        <div className={`absolute w-full h-full backface-hidden border-2 rounded-xl flex items-center justify-center group ${theme.bgClass}`}>
          <div className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center ${theme.decorClass} group-hover:opacity-80`}>
             {/* Small center dot or icon could go here */}
             <div className="w-4 h-4 rounded-full bg-white/20"></div>
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>

        {/* Front of Card (Face Up) */}
        <div className={`absolute w-full h-full backface-hidden rotate-y-180 bg-slate-800 border-2 border-indigo-500 rounded-xl flex flex-col items-center justify-center p-2 text-center shadow-[0_0_15px_rgba(99,102,241,0.3)] ${config.color}`}>
          <div className="mb-2">
            {renderIcon()}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">{config.label}</span>
          <span className="text-[10px] opacity-70 mt-1">
             {card.effect.includes('ATTACK') ? `DMG ${config.value}` : 
              card.effect.includes('HEAL') ? `HP +${config.value}` :
              card.effect.includes('SHIELD') ? `ARMOR +${config.value}` :
              `+${config.value}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Card;