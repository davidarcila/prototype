import React from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  shield: number;
  label: string;
  isEnemy?: boolean;
}

const HealthBar: React.FC<HealthBarProps> = ({ current, max, shield, label, isEnemy }) => {
  const hpPercent = Math.max(0, Math.min(100, (current / max) * 100));
  
  return (
    <div className={`w-full max-w-xs ${isEnemy ? 'text-right' : 'text-left'}`}>
      <div className="flex justify-between items-end mb-1">
        <span className={`font-bold text-sm ${isEnemy ? 'text-red-400' : 'text-blue-400'}`}>{label}</span>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
           {shield > 0 && (
             <span className="text-blue-300 font-bold">({shield})</span>
           )}
           <span>{Math.ceil(current)}/{max}</span>
        </div>
      </div>
      <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
        <div 
          className={`h-full transition-all duration-500 ease-out ${isEnemy ? 'bg-red-600' : 'bg-green-500'}`}
          style={{ width: `${hpPercent}%` }}
        />
        {/* Shield Overlay */}
        {shield > 0 && (
          <div 
             className="absolute top-0 left-0 h-full bg-blue-500/50 border-r-2 border-blue-400 box-content transition-all duration-300"
             style={{ width: `${Math.min(100, (shield / max) * 100)}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default HealthBar;