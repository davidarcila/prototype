export interface GameState {
  money: number;
  totalFlips: number;
  totalHeads: number;
  paragonPoints: number; // Prestige currency
  upgrades: {
    value: number; // Index in VALUE_LEVELS
    speed: number; // Index in SPEED_LEVELS
    odds: number;  // Index in ODDS_LEVELS
    auto: number;  // Index in AUTO_LEVELS
    count: number; // Index in COUNT_LEVELS
    crit: number;  // Index in CRIT_LEVELS
  };
}

export enum CoinSide {
  HEADS = 'HEADS',
  TAILS = 'TAILS',
}

export interface CoinState {
  id: number;
  side: CoinSide;
  isFlipping: boolean;
  lastWin: number | null;
  isCrit: boolean;
}

export interface UpgradeConfig {
  id: keyof GameState['upgrades'];
  name: string;
  description: string;
  costs: number[]; // Fixed costs per level
}

export interface FlipResult {
  side: CoinSide;
  payout: number;
  isCrit: boolean;
}