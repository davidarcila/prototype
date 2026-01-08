import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coins, Skull, RefreshCw, Trophy, ShieldAlert, Zap, ShoppingBag, BookOpen, ArrowLeft, Check, Lock, Flame, Sword, Share2, Copy } from 'lucide-react';
import Card from './components/Card';
import HealthBar from './components/HealthBar';
import { CardData, CardEffect, Entity, GameState, LogEntry, Screen, UserProgress, CardTheme } from './types';
import { generateDeck, EFFECT_CONFIG, DECK_COMPOSITION, CARD_THEMES } from './constants';
import { generateDailyEnemy } from './services/gemini';
import { initAudio, playSound } from './services/audio';

const App: React.FC = () => {
  // --- Persistent User State ---
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('dungeon_user_progress');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      coins: 0,
      unlockedThemes: ['default'],
      selectedThemeId: 'default',
      lastDailyClaim: '',
      bestiary: []
    };
  });

  // Save progress whenever it changes
  useEffect(() => {
    localStorage.setItem('dungeon_user_progress', JSON.stringify(userProgress));
  }, [userProgress]);

  // --- Game State ---
  const [screen, setScreen] = useState<Screen>('MENU');
  const [cards, setCards] = useState<CardData[]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [combo, setCombo] = useState<number>(0);
  
  // Game History for Sharing
  const [matchHistory, setMatchHistory] = useState<string[]>([]);
  const [showCopied, setShowCopied] = useState(false);
  
  // Entities
  const [player, setPlayer] = useState<Entity>({ 
    name: 'Hero', 
    maxHp: 10, 
    currentHp: 10, 
    shield: 0, 
    coins: 0 
  });
  
  const [enemy, setEnemy] = useState<Entity>({ 
    name: 'Loading...', 
    maxHp: 10, 
    currentHp: 10, 
    shield: 0, 
    description: '' 
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Animations
  const [playerAnim, setPlayerAnim] = useState<string>('');
  const [enemyAnim, setEnemyAnim] = useState<string>('');
  
  // AI Memory & Game Control
  const aiMemory = useRef<Map<number, CardData>>(new Map());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isGameOverRef = useRef(false);

  // --- Helpers ---
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(36), message, type }]);
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const triggerAnim = (target: 'PLAYER' | 'ENEMY', anim: string) => {
    if (target === 'PLAYER') {
      setPlayerAnim(anim);
      setTimeout(() => setPlayerAnim(''), 500);
    } else {
      setEnemyAnim(anim);
      setTimeout(() => setEnemyAnim(''), 500);
    }
  };

  // --- Game Initialization ---
  const initGame = useCallback(async () => {
    // Initialize audio context on user interaction
    initAudio();
    
    isGameOverRef.current = false;
    setGameState(GameState.LOADING);
    setScreen('GAME');
    const dateStr = getTodayString();
    
    // Generate board
    const initialDeck = generateDeck(dateStr);
    setCards(initialDeck);
    
    // Reset Player
    setPlayer({ name: 'Hero', maxHp: 10, currentHp: 10, shield: 0, coins: 0 });
    setFlippedIndices([]);
    setLogs([]);
    setCombo(0);
    setPlayerAnim('');
    setEnemyAnim('');
    setMatchHistory([]);
    aiMemory.current.clear();

    // Fetch Enemy
    const dailyEnemy = await generateDailyEnemy(dateStr);
    setEnemy(dailyEnemy);
    
    setGameState(GameState.PLAYER_TURN);
    addLog(`A wild ${dailyEnemy.name} appears!`, 'enemy');
    addLog(dailyEnemy.description || "Prepare for battle!", 'info');
  }, []);

  // Scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // --- Reshuffle Logic ---
  const reshuffleDeck = useCallback(() => {
    if (isGameOverRef.current) return;
    addLog("The dungeon rearranges itself...", 'info');
    playSound('flip');
    
    let deckEffects: CardEffect[] = [];
    DECK_COMPOSITION.forEach(effect => {
      deckEffects.push(effect);
      deckEffects.push(effect);
    });

    for (let i = deckEffects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckEffects[i], deckEffects[j]] = [deckEffects[j], deckEffects[i]];
    }

    const newCards = deckEffects.map((effect, index) => ({
      id: `card-round-${Date.now()}-${index}`,
      effect,
      isFlipped: false,
      isMatched: false,
    }));
    
    setCards(newCards);
    setFlippedIndices([]);
    aiMemory.current.clear();
  }, []);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      if (enemy.currentHp > 0 && player.currentHp > 0) {
        const timer = setTimeout(() => {
          reshuffleDeck();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [cards, enemy.currentHp, player.currentHp, reshuffleDeck]);

  // --- Combat Logic ---
  const applyEffect = (effect: CardEffect, source: 'PLAYER' | 'ENEMY', currentCombo: number) => {
    const config = EFFECT_CONFIG[effect];
    let value = config.value;
    
    // Apply Combo Multiplier (Base + 50% per stack)
    if (currentCombo > 0) {
      value = Math.floor(value * (1 + currentCombo * 0.5));
    }

    const isPlayerSource = source === 'PLAYER';
    
    // Record History (only relevant moves for flavor)
    if (isPlayerSource) {
      let emoji = '⬜';
      if (effect.includes('ATTACK')) emoji = '⚔️';
      else if (effect.includes('HEAL')) emoji = '💚';
      else if (effect.includes('SHIELD')) emoji = '🛡️';
      else if (effect.includes('COIN')) emoji = '🪙';
      setMatchHistory(prev => [...prev, emoji]);
    } else {
      // Record enemy move? Maybe just distinguish with red?
      // For simplicity, let's only record player moves or major events for the share string
      if (effect.includes('ATTACK')) setMatchHistory(prev => [...prev, '🩸']);
    }

    // Trigger Animations & Sounds
    if (effect.includes('ATTACK')) {
       playSound('attack');
       if (isPlayerSource) {
         triggerAnim('PLAYER', 'anim-attack-up');
         setTimeout(() => triggerAnim('ENEMY', 'anim-damage'), 150);
       } else {
         triggerAnim('ENEMY', 'anim-attack-down');
         setTimeout(() => triggerAnim('PLAYER', 'anim-damage'), 150);
       }
    } else if (effect.includes('HEAL')) {
       playSound('heal');
       triggerAnim(isPlayerSource ? 'PLAYER' : 'ENEMY', 'anim-heal');
    } else if (effect.includes('SHIELD')) {
       playSound('shield');
       triggerAnim(isPlayerSource ? 'PLAYER' : 'ENEMY', 'anim-heal');
    } else if (effect.includes('COIN') && isPlayerSource) {
       playSound('coin');
       triggerAnim('PLAYER', 'anim-heal');
    }

    const damageEntity = (target: Entity, amount: number): Entity => {
      let dmg = amount;
      let newShield = target.shield;
      
      if (newShield > 0) {
        if (newShield >= dmg) {
          newShield -= dmg;
          dmg = 0;
        } else {
          dmg -= newShield;
          newShield = 0;
        }
      }
      
      const newHp = Math.max(0, target.currentHp - dmg);
      return { ...target, currentHp: newHp, shield: newShield };
    };

    const comboText = currentCombo > 0 ? ` (Combo x${1 + currentCombo * 0.5}!)` : '';

    if (effect.includes('ATTACK')) {
      if (isPlayerSource) {
        setEnemy(prev => damageEntity(prev, value));
        addLog(`Player attacks for ${value} damage!${comboText}`, 'player');
      } else {
        setPlayer(prev => damageEntity(prev, value));
        addLog(`${enemy.name} attacks you for ${value} damage!${comboText}`, 'enemy');
      }
    } 
    else if (effect.includes('HEAL')) {
      if (isPlayerSource) {
        setPlayer(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + value) }));
        addLog(`Player heals for ${value} HP.${comboText}`, 'heal');
      } else {
        setEnemy(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + value) }));
        addLog(`${enemy.name} heals for ${value} HP.${comboText}`, 'enemy');
      }
    }
    else if (effect.includes('SHIELD')) {
      if (isPlayerSource) {
        setPlayer(prev => ({ ...prev, shield: prev.shield + value }));
        addLog(`Player gains ${value} Shield.${comboText}`, 'player');
      } else {
        setEnemy(prev => ({ ...prev, shield: prev.shield + value }));
        addLog(`${enemy.name} raises a shield (${value}).${comboText}`, 'enemy');
      }
    }
    else if (effect.includes('COIN')) {
      if (isPlayerSource) {
        setPlayer(prev => ({ ...prev, coins: (prev.coins || 0) + value }));
        addLog(`Player found ${value} coins!${comboText}`, 'info');
      } else {
        addLog(`${enemy.name} finds some gold.${comboText}`, 'info');
      }
    }
  };

  // --- Interaction Logic ---
  const handleCardClick = (clickedCard: CardData) => {
    if (gameState !== GameState.PLAYER_TURN || flippedIndices.length >= 2 || isGameOverRef.current) return;

    const realIndex = cards.findIndex(c => c.id === clickedCard.id);
    if (realIndex === -1) return;

    playSound('flip');

    const newCards = [...cards];
    newCards[realIndex].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedIndices, realIndex];
    setFlippedIndices(newFlipped);

    aiMemory.current.set(realIndex, clickedCard);

    if (newFlipped.length === 2) {
      const card1 = newCards[newFlipped[0]];
      const card2 = newCards[newFlipped[1]];

      if (card1.effect === card2.effect) {
        // MATCH
        setTimeout(() => {
          handleMatch(newFlipped[0], newFlipped[1], card1.effect, 'PLAYER');
        }, 500);
      } else {
        // NO MATCH
        setTimeout(() => {
          unflipCards(newFlipped);
          // End turn, reset combo
          setCombo(0); 
          setGameState(GameState.ENEMY_THINKING);
        }, 1000);
      }
    }
  };

  const handleMatch = (idx1: number, idx2: number, effect: CardEffect, who: 'PLAYER' | 'ENEMY') => {
    if (isGameOverRef.current) return;

    setCards(prev => {
      const c = [...prev];
      if (c[idx1]) c[idx1].isMatched = true;
      if (c[idx2]) c[idx2].isMatched = true;
      return c;
    });
    setFlippedIndices([]);

    if (who === 'PLAYER') {
      playSound('match');
      if (combo > 0) {
        setTimeout(() => playSound('combo'), 100);
      }
    } else {
      playSound('enemy_match');
    }

    applyEffect(effect, who, combo);
    
    // Increment combo
    setCombo(prev => prev + 1);
    
    aiMemory.current.delete(idx1);
    aiMemory.current.delete(idx2);

    // If enemy matched, they usually get another turn.
    // However, if the game is about to end, we shouldn't schedule it.
    // The safest way is to schedule it, but executeAiTurn will check isGameOverRef.
    if (who === 'ENEMY') {
      setTimeout(() => executeAiTurn(), 1000); 
    }
  };

  const unflipCards = (indices: number[]) => {
    playSound('flip'); // Flip back sound
    setCards(prev => {
      const c = [...prev];
      indices.forEach(i => {
        if (c[i]) c[i].isFlipped = false;
      });
      return c;
    });
    setFlippedIndices([]);
  };

  // --- End Game Checks ---
  useEffect(() => {
    if (gameState !== GameState.VICTORY && gameState !== GameState.DEFEAT) {
      if (player.currentHp <= 0) {
        setGameState(GameState.DEFEAT);
        playSound('defeat');
        isGameOverRef.current = true;
        return;
      }
      if (enemy.currentHp <= 0) {
        setGameState(GameState.VICTORY);
        playSound('victory');
        isGameOverRef.current = true;
        
        // Save victory progress
        setUserProgress(prev => {
           // Add coins
           const newCoins = prev.coins + (player.coins || 0);
           // Add to bestiary if not exists
           const knownEnemy = prev.bestiary.find(e => e.name === enemy.name);
           let newBestiary = [...prev.bestiary];
           if (!knownEnemy) {
             newBestiary.push({ ...enemy, dateEncountered: getTodayString() });
           }
           return { ...prev, coins: newCoins, bestiary: newBestiary };
        });
        return;
      }
    }

    if (gameState === GameState.ENEMY_THINKING) {
      const aiTimeout = setTimeout(() => {
        executeAiTurn();
      }, 1500);
      return () => clearTimeout(aiTimeout);
    }
  }, [player.currentHp, enemy.currentHp, gameState]);

  // --- AI Logic ---
  const executeAiTurn = () => {
    // If game ended, stop
    if (isGameOverRef.current || player.currentHp <= 0 || enemy.currentHp <= 0) return;

    setGameState(GameState.ENEMY_ACTING);
    const memory = aiMemory.current;
    
    // Find pair in memory
    let matchFound: [number, number] | null = null;
    const seenEffects = new Map<CardEffect, number>();
    for (const [idx, card] of memory.entries()) {
      if (cards[idx] && cards[idx].isMatched) continue;

      if (seenEffects.has(card.effect)) {
        matchFound = [seenEffects.get(card.effect)!, idx];
        break;
      }
      seenEffects.set(card.effect, idx);
    }

    // NERF: 35% chance to "forget" a known match
    if (matchFound && Math.random() < 0.35) {
      matchFound = null;
    }

    const availableIndices = cards
      .map((c, i) => (c.isMatched ? -1 : i))
      .filter(i => i !== -1);
    
    if (availableIndices.length === 0) return;

    let firstIdx: number;
    let secondIdx: number;

    if (matchFound) {
      [firstIdx, secondIdx] = matchFound;
    } else {
      const unknownIndices = availableIndices.filter(i => !memory.has(i));
      if (unknownIndices.length > 0) {
         firstIdx = unknownIndices[Math.floor(Math.random() * unknownIndices.length)];
      } else {
         firstIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      }
    }

    // AI Execute
    flipCardAI(firstIdx).then((card1) => {
       if (isGameOverRef.current) return;
       playSound('flip');
       aiMemory.current.set(firstIdx, card1);

       if (!matchFound) {
          // Check if the card we just flipped matches something in memory
          let pairInMem = -1;
          for (const [idx, mCard] of memory.entries()) {
             if (idx !== firstIdx && !mCard.isMatched && mCard.effect === card1.effect) {
                pairInMem = idx;
                break;
             }
          }

          if (pairInMem !== -1) {
             // NERF: 40% chance to miss the connection
             if (Math.random() < 0.4) {
                 const validSeconds = availableIndices.filter(i => i !== firstIdx);
                 secondIdx = validSeconds[Math.floor(Math.random() * validSeconds.length)];
             } else {
                 secondIdx = pairInMem;
                 addLog(`${enemy.name} recognizes that card!`, 'enemy');
             }
          } else {
             const validSeconds = availableIndices.filter(i => i !== firstIdx);
             secondIdx = validSeconds[Math.floor(Math.random() * validSeconds.length)];
          }
       }

       setTimeout(() => {
         if (isGameOverRef.current) return;
         flipCardAI(secondIdx).then((card2) => {
            playSound('flip');
            aiMemory.current.set(secondIdx, card2);
            
            if (card1.effect === card2.effect) {
               setTimeout(() => {
                 handleMatch(firstIdx, secondIdx, card1.effect, 'ENEMY');
                 // AI keeps turn handled in handleMatch
               }, 800);
            } else {
               setTimeout(() => {
                 unflipCards([firstIdx, secondIdx]);
                 setCombo(0); // Reset combo on miss
                 setGameState(GameState.PLAYER_TURN);
               }, 1000);
            }
         });
       }, 800);
    });
  };

  const flipCardAI = (index: number): Promise<CardData> => {
    return new Promise((resolve) => {
       setCards(prev => {
         const c = [...prev];
         if (c[index]) c[index].isFlipped = true;
         return c;
       });
       setFlippedIndices(prev => [...prev, index]);
       resolve(cards[index]);
    });
  };

  const shareResult = async () => {
    const status = gameState === GameState.VICTORY ? '🏆 Victory' : '💀 Defeat';
    const hp = Math.ceil(player.currentHp);
    const moves = matchHistory.join('');
    const text = `Fortune Flip 🏰\n${new Date().toDateString()}\nVS ${enemy.name}\n${status} (HP: ${hp}/10)\n\n${moves}\n\nPlay now!`;
    
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };


  // --- MENU COMPONENT ---
  const renderMenu = () => {
    const today = new Date().toDateString();
    const canClaim = userProgress.lastDailyClaim !== today;
    const currentTheme = CARD_THEMES.find(t => t.id === userProgress.selectedThemeId) || CARD_THEMES[0];

    const claimDaily = () => {
      playSound('coin');
      setUserProgress(prev => ({
        ...prev,
        coins: prev.coins + 1,
        lastDailyClaim: today
      }));
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-2xl mx-auto p-4 gap-8">
         <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-cyan-400">
              Fortune Flip
            </h1>
            <p className="text-slate-400">Match cards, build combos, survive.</p>
         </div>

         <div className="grid grid-cols-2 gap-4 w-full">
            <button onClick={initGame} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white p-6 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-3">
              <Sword className="w-6 h-6" /> Play Daily Run
            </button>
            
            <button onClick={() => setScreen('STORE')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-6 rounded-xl font-bold transition-all flex flex-col items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-yellow-500" />
              <span>Card Store</span>
            </button>
            
            <button onClick={() => setScreen('BESTIARY')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-6 rounded-xl font-bold transition-all flex flex-col items-center gap-2">
              <BookOpen className="w-8 h-8 text-cyan-500" />
              <span>Bestiary</span>
            </button>
         </div>

         {/* Daily Streak */}
         <div className="w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className={`w-8 h-8 ${canClaim ? 'text-orange-500 animate-pulse' : 'text-slate-600'}`} />
              <div>
                <h3 className="font-bold text-slate-200">Daily Reward</h3>
                <p className="text-xs text-slate-500">{canClaim ? 'Available now!' : 'Come back tomorrow'}</p>
              </div>
            </div>
            <button 
              disabled={!canClaim}
              onClick={claimDaily}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${canClaim ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              <Coins className="w-4 h-4" />
              {canClaim ? 'Claim 1' : 'Claimed'}
            </button>
         </div>

         {/* Stats */}
         <div className="flex items-center gap-6 text-slate-400 text-sm font-mono">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span>{userProgress.coins} Coins</span>
            </div>
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-red-500" />
              <span>{userProgress.bestiary.length} Slain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${currentTheme.bgClass}`}></div>
              <span>Theme: {currentTheme.name}</span>
            </div>
         </div>
      </div>
    );
  };

  // --- STORE COMPONENT ---
  const renderStore = () => {
    const buyTheme = (theme: CardTheme) => {
      if (userProgress.coins >= theme.price) {
        playSound('coin');
        setUserProgress(prev => ({
          ...prev,
          coins: prev.coins - theme.price,
          unlockedThemes: [...prev.unlockedThemes, theme.id],
          selectedThemeId: theme.id
        }));
      }
    };

    const selectTheme = (id: string) => {
      playSound('flip');
      setUserProgress(prev => ({ ...prev, selectedThemeId: id }));
    };

    return (
      <div className="min-h-screen w-full p-4 md:p-8 flex flex-col max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
           <button onClick={() => setScreen('MENU')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" /> Back
           </button>
           <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
             <Coins className="w-5 h-5 text-yellow-500" />
             <span className="font-bold font-mono">{userProgress.coins}</span>
           </div>
        </header>

        <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-3">
          <ShoppingBag className="text-yellow-500" /> Card Back Store
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {CARD_THEMES.map(theme => {
             const isUnlocked = userProgress.unlockedThemes.includes(theme.id);
             const isSelected = userProgress.selectedThemeId === theme.id;

             return (
               <div key={theme.id} className={`bg-slate-800 rounded-xl p-4 border-2 transition-all relative overflow-hidden group ${isSelected ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-slate-700'}`}>
                  {/* Preview */}
                  <div className={`w-full aspect-[2/1] rounded-lg mb-4 flex items-center justify-center relative ${theme.bgClass}`}>
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme.decorClass}`}>
                       <div className="w-4 h-4 rounded-full bg-white/20"></div>
                     </div>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                       <h3 className="font-bold text-lg">{theme.name}</h3>
                       <p className="text-xs text-slate-400">{theme.description}</p>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <button 
                      onClick={() => selectTheme(theme.id)}
                      disabled={isSelected}
                      className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 ${isSelected ? 'bg-indigo-600/50 text-indigo-200 cursor-default' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                    >
                      {isSelected ? <><Check className="w-4 h-4" /> Equipped</> : 'Equip'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => buyTheme(theme)}
                      disabled={userProgress.coins < theme.price}
                      className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 ${userProgress.coins >= theme.price ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                    >
                      {userProgress.coins >= theme.price ? (
                         <>Buy for <Coins className="w-4 h-4" /> {theme.price}</>
                      ) : (
                         <><Lock className="w-4 h-4" /> {theme.price}</>
                      )}
                    </button>
                  )}
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  // --- BESTIARY COMPONENT ---
  const renderBestiary = () => {
    return (
      <div className="min-h-screen w-full p-4 md:p-8 flex flex-col max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
           <button onClick={() => setScreen('MENU')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" /> Back
           </button>
        </header>

        <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-3">
          <BookOpen className="text-cyan-500" /> Bestiary
        </h2>

        {userProgress.bestiary.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
            <Skull className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">No monsters defeated yet.</p>
            <p className="text-sm">Play the game to fill your journal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {userProgress.bestiary.map((entry, idx) => (
               <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4">
                  <div className="w-16 h-16 bg-red-900/20 rounded-lg flex items-center justify-center border border-red-500/30 flex-shrink-0">
                    <Skull className="text-red-500 w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{entry.name}</h3>
                    <p className="text-xs text-slate-400 italic mb-2">{entry.description}</p>
                    <div className="flex gap-3 text-xs font-mono text-slate-500">
                      <span>HP: {entry.maxHp}</span>
                      <span>Encountered: {entry.dateEncountered}</span>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  // --- GAME COMPONENT ---
  const renderGame = () => {
    const activeTheme = CARD_THEMES.find(t => t.id === userProgress.selectedThemeId) || CARD_THEMES[0];

    if (gameState === GameState.LOADING) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <RefreshCw className="w-12 h-12 animate-spin text-indigo-500" />
            <p className="text-xl font-mono">Summoning Daily Monster...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row max-w-7xl mx-auto overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-full md:w-1/3 p-4 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50">
          <header className="flex flex-row justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                Fortune Flip
              </h1>
              <p className="text-xs text-slate-500 font-mono uppercase">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={() => setScreen('MENU')} className="text-xs text-slate-400 hover:text-white">Exit Run</button>
          </header>

          {/* ENEMY SECTION */}
          <div className={`bg-slate-800/60 p-4 rounded-xl border border-red-900/30 shadow-lg ${enemyAnim}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/30">
                <Skull className="text-red-500 w-6 h-6" />
              </div>
              <div>
                 <h2 className="font-bold text-lg leading-none">{enemy.name}</h2>
                 <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">{enemy.description}</p>
              </div>
            </div>
            <HealthBar current={enemy.currentHp} max={enemy.maxHp} shield={enemy.shield} label="ENEMY HP" isEnemy />
          </div>

          {/* PLAYER SECTION */}
          <div className={`bg-slate-800/60 p-4 rounded-xl border border-indigo-900/30 shadow-lg relative overflow-hidden ${playerAnim}`}>
             {combo > 1 && (
               <div className="absolute top-2 right-2 flex items-center gap-1 text-yellow-400 font-bold animate-bounce bg-black/50 px-2 rounded-full border border-yellow-500/50">
                 <Zap className="w-3 h-3 fill-yellow-400" />
                 <span className="text-xs">COMBO x{1 + combo * 0.5}</span>
               </div>
             )}
             <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-indigo-900/20 flex items-center justify-center border border-indigo-500/30">
                <ShieldAlert className="text-indigo-500 w-6 h-6" />
              </div>
              <div className="flex-1">
                 <h2 className="font-bold text-lg leading-none">{player.name}</h2>
                 <div className="flex items-center gap-2 mt-1">
                   <Coins className="w-3 h-3 text-yellow-500" />
                   <span className="text-xs text-yellow-400 font-mono">+{player.coins} Gold</span>
                 </div>
              </div>
            </div>
            <HealthBar current={player.currentHp} max={player.maxHp} shield={player.shield} label="YOUR HP" />
          </div>

          <div className="flex-1 min-h-[150px] bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none" />
            <div 
              ref={logContainerRef}
              className="overflow-y-auto flex-1 pr-2 space-y-2 text-sm font-mono scrollbar-thin scrollbar-thumb-slate-700"
            >
              {logs.length === 0 && <span className="text-slate-600 italic">Battle start...</span>}
              {logs.map((log) => (
                <div key={log.id} className={`
                  ${log.type === 'enemy' ? 'text-red-400' : 
                    log.type === 'player' ? 'text-indigo-400' : 
                    log.type === 'heal' ? 'text-green-400' : 'text-slate-400'}
                `}>
                  <span className="opacity-50 text-[10px] mr-2">{'>'}</span>
                  {log.message}
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* RIGHT PANEL: BOARD */}
        <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          
          <div className="absolute top-4 md:top-8 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 backdrop-blur border border-slate-700 shadow-xl z-10 transition-colors duration-500">
             {gameState === GameState.PLAYER_TURN ? (
               <>
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  <span className="font-bold text-indigo-300">Your Turn</span>
               </>
             ) : gameState === GameState.ENEMY_THINKING || gameState === GameState.ENEMY_ACTING ? (
                <>
                 <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                 <span className="font-bold text-red-300">Enemy Turn</span>
                </>
             ) : <span className="font-bold text-white">Game Over</span>}
          </div>

          <div className="grid grid-cols-4 gap-3 w-full max-w-md mx-auto aspect-square">
            {cards.map((card) => (
              <Card 
                key={card.id} 
                card={card} 
                onClick={handleCardClick} 
                disabled={gameState !== GameState.PLAYER_TURN}
                theme={activeTheme}
                combo={combo}
              />
            ))}
          </div>

          {(gameState === GameState.VICTORY || gameState === GameState.DEFEAT) && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center transform transition-all animate-[fadeIn_0.5s_ease-out]">
                  {gameState === GameState.VICTORY ? (
                    <div className="flex flex-col items-center gap-4">
                      <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
                      <h2 className="text-3xl font-bold text-white">Victory!</h2>
                      <p className="text-slate-400">You defeated the {enemy.name} and claimed {player.coins} gold.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Skull className="w-16 h-16 text-red-500 animate-pulse" />
                      <h2 className="text-3xl font-bold text-white">Defeat</h2>
                      <p className="text-slate-400">The {enemy.name} was too strong...</p>
                    </div>
                  )}

                  <div className="w-full bg-slate-800 rounded-lg p-3 my-4 font-mono text-xs tracking-widest text-slate-400 break-words border border-slate-700">
                      {matchHistory.length > 0 ? matchHistory.join(' ') : 'No moves recorded.'}
                  </div>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                        onClick={shareResult}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {showCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        {showCopied ? 'Copied!' : 'Share Result'}
                    </button>

                    <button 
                        onClick={() => setScreen('MENU')}
                        className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Menu
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <>
      {screen === 'MENU' && renderMenu()}
      {screen === 'STORE' && renderStore()}
      {screen === 'BESTIARY' && renderBestiary()}
      {screen === 'GAME' && renderGame()}
    </>
  );
};

export default App;