import React, { useState } from 'react';
import { GameState } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface GuruProps {
  gameState: GameState;
}

const Guru: React.FC<GuruProps> = ({ gameState }) => {
  const [advice, setAdvice] = useState<string>("Click 'Ask Guru' for financial wisdom.");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (loading) return;
    setLoading(true);
    setAdvice("Consulting the blockchain spirits...");
    try {
      const text = await getFinancialAdvice(gameState);
      setAdvice(text);
    } catch (e) {
      setAdvice("The spirits are silent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-indigo-900/30 rounded-2xl p-6 border border-indigo-500/30 mt-6 relative overflow-hidden">
        {/* Background decorative blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-indigo-200 flex items-center gap-2">
                    <span className="text-2xl">🧙‍♂️</span> 
                    AI Financial Guru
                </h2>
                <button 
                    onClick={handleAsk}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-900/50"
                >
                    {loading ? 'Thinking...' : 'Ask Guru'}
                </button>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-indigo-500/20 min-h-[80px] flex items-center">
                <p className="text-indigo-100 text-sm italic leading-relaxed w-full">
                    "{advice}"
                </p>
            </div>
            
            <p className="text-[10px] text-indigo-400/60 mt-2 text-right">
                Powered by Gemini 2.5 Flash
            </p>
        </div>
    </div>
  );
};

export default Guru;