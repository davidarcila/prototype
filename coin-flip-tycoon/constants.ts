import { UpgradeConfig } from './types';

// --- Upgrade Stat Definitions ---

// COIN VALUE: Ultra aggressive scaling for 5-minute demo
export const VALUE_LEVELS = [0.25, 0.75, 2.50, 7.50, 25.00, 100.00, 500.00, 2500.00];
const VALUE_COSTS = [1, 5, 20, 100, 500, 2500, 10000, 50000];

// COIN FLIP TIME: Starts fast, hits hyper-speed instantly
export const SPEED_LEVELS_MS = [1200, 800, 500, 300, 200, 150, 100, 50];
const SPEED_COSTS = [2, 10, 50, 250, 1000, 5000, 20000, 75000];

// BETTER ODDS: Rapidly approach near-certainty
export const ODDS_LEVELS = [0.60, 0.75, 0.85, 0.95];
const ODDS_COSTS = [30, 200, 1500]; 

// AUTOMATIZATION: Extremely cheap to get the engine running
export const AUTO_LEVELS_MS = [600, 350, 200, 100, 50];
const AUTO_COSTS = [5, 25, 125, 600, 3000];

// COIN AMOUNT: Quickly fill the screen with wealth
export const COUNT_LEVELS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const COUNT_COSTS = [15, 75, 400, 2000, 8000, 30000, 100000, 400000, 1000000];

// CRITICAL FLIP: High stakes, low cost
export const CRIT_LEVELS = [0.20, 0.40, 0.60, 0.80];
const CRIT_COSTS = [40, 250, 1000, 5000];


export const UPGRADES: UpgradeConfig[] = [
  {
    id: 'value',
    name: 'Pure Midas Gold',
    description: 'Increases base value significantly.',
    costs: VALUE_COSTS,
  },
  {
    id: 'speed',
    name: 'Supersonic Spin',
    description: 'Reduces flip time to near-zero.',
    costs: SPEED_COSTS,
  },
  {
    id: 'odds',
    name: 'Magnets!',
    description: 'Heads becomes almost inevitable.',
    costs: ODDS_COSTS,
  },
  {
    id: 'count',
    name: 'Coin Rain',
    description: 'Adds more coins to your collection.',
    costs: COUNT_COSTS,
  },
  {
    id: 'auto',
    name: 'Flipping Engine',
    description: 'Rapid-fire automatic flipping.',
    costs: AUTO_COSTS,
  },
  {
    id: 'crit',
    name: 'Jackpot Charm',
    description: 'Massive crit chance for double cash.',
    costs: CRIT_COSTS,
  }
];

// Paragon Settings for Hyper-Speed Demo
export const PARAGON_MULTIPLIER_PER_POINT = 1.0; // 100% bonus per point (Insane growth!)
export const PRESTIGE_REQ = 250; // Dropped significantly for quick ascension loop
