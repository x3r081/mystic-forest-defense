/**
 * Difficulty presets applied to every round in a run.
 *
 * Tuned for a 500-level campaign across 10 maps (50 levels each).
 */

export type DifficultyId = 'easy' | 'medium' | 'hard';

export interface DifficultyDef {
  id: DifficultyId;
  label: string;
  description: string;
  startingLives: number;
  startingCoins: number;
  enemyHealthMul: number;
  enemySpeedMul: number;
  enemyCountMul: number;
  coinRewardMul: number;
  bossHealthMul: number;
  /** Bonus coins when entering a new map act after clearing a boss level. */
  mapTransitionBonus: number;
}

export const difficulties: Record<DifficultyId, DifficultyDef> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'Gentle foes, generous coin — room to experiment across long map acts.',
    startingLives: 32,
    startingCoins: 240,
    enemyHealthMul: 0.72,
    enemySpeedMul: 0.88,
    enemyCountMul: 0.78,
    coinRewardMul: 1.35,
    bossHealthMul: 0.72,
    mapTransitionBonus: 220,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced challenge — plan upgrades across each 50-level act.',
    startingLives: 22,
    startingCoins: 185,
    enemyHealthMul: 1.0,
    enemySpeedMul: 1.0,
    enemyCountMul: 1.0,
    coinRewardMul: 1.0,
    bossHealthMul: 1.0,
    mapTransitionBonus: 165,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Relentless waves and tight margins across the full campaign.',
    startingLives: 14,
    startingCoins: 150,
    enemyHealthMul: 1.22,
    enemySpeedMul: 1.1,
    enemyCountMul: 1.12,
    coinRewardMul: 0.88,
    bossHealthMul: 1.28,
    mapTransitionBonus: 120,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'medium';

export function getDifficulty(id: DifficultyId): DifficultyDef {
  return difficulties[id];
}
