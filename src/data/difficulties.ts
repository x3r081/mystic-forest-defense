/**
 * Difficulty presets applied to every round in a run.
 *
 * Tuned for a 100-level campaign across 10 maps (10 levels each).
 * Easy is relaxed; Medium is the baseline; Hard is tense but fair —
 * not starved for coins (hard runs earn slightly less per kill but face
 * more foes, so income stays comparable while pressure comes from HP/speed/lives).
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
    description: 'Gentle foes, generous coin — perfect for learning the campaign.',
    startingLives: 32,
    startingCoins: 200,
    enemyHealthMul: 0.72,
    enemySpeedMul: 0.88,
    enemyCountMul: 0.78,
    coinRewardMul: 1.35,
    bossHealthMul: 0.72,
    mapTransitionBonus: 150,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced challenge — plan your build across every map act.',
    startingLives: 22,
    startingCoins: 155,
    enemyHealthMul:  1.0,
    enemySpeedMul: 1.0,
    enemyCountMul: 1.0,
    coinRewardMul: 1.0,
    bossHealthMul: 1.0,
    mapTransitionBonus: 115,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Relentless waves and tight margins — tense, but completable.',
    startingLives: 14,
    startingCoins: 125,
    enemyHealthMul: 1.22,
    enemySpeedMul: 1.1,
    enemyCountMul: 1.12,
    coinRewardMul: 0.88,
    bossHealthMul: 1.28,
    mapTransitionBonus: 85,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'medium';

export function getDifficulty(id: DifficultyId): DifficultyDef {
  return difficulties[id];
}
