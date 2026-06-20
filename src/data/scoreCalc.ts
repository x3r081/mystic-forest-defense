import type { DifficultyId } from './difficulties';
import { TOTAL_LEVELS } from './levels';

const DIFFICULTY_MULT: Record<DifficultyId, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.5,
};

export interface RunScoreInput {
  difficulty: DifficultyId;
  highestLevelReached: number;
  victory: boolean;
  coins: number;
  lives: number;
  enemiesKilled: number;
  bossesDefeated: number;
  mergedTowersCreated: number;
  maxLevelTowersCreated: number;
}

export function computeRunScore(input: RunScoreInput): number {
  const base =
    input.highestLevelReached * 1000 +
    input.coins * 2 +
    input.lives * 500 +
    input.enemiesKilled * 10 +
    input.bossesDefeated * 2000 +
    input.mergedTowersCreated * 300 +
    input.maxLevelTowersCreated * 150 +
    (input.victory ? 5000 : 0);

  return Math.max(1, Math.round(base * DIFFICULTY_MULT[input.difficulty]));
}

export function highestLevelForRun(level: number, victory: boolean): number {
  return victory ? TOTAL_LEVELS : Math.max(1, level);
}
