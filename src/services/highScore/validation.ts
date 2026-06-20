import type { DifficultyId } from '../../data/difficulties';
import { TOTAL_LEVELS } from '../../data/levels';
import type { ScoreSubmission } from './types';

const DIFFICULTIES: DifficultyId[] = ['easy', 'medium', 'hard'];
const MAX_STAT = 999_999;

export function sanitizePlayerName(raw: string): string {
  return raw.trim().slice(0, 16);
}

export function validatePlayerName(name: string): string | null {
  const trimmed = sanitizePlayerName(name);
  if (trimmed.length < 1 || trimmed.length > 16) {
    return 'Name must be 1–16 characters.';
  }
  return null;
}

export function validateScoreSubmission(entry: ScoreSubmission): string | null {
  const nameErr = validatePlayerName(entry.playerName);
  if (nameErr) return nameErr;

  if (!Number.isFinite(entry.score) || entry.score <= 0) {
    return 'Score must be a positive number.';
  }

  if (!DIFFICULTIES.includes(entry.difficulty)) {
    return 'Invalid difficulty.';
  }

  if (
    !Number.isInteger(entry.highestLevelReached) ||
    entry.highestLevelReached < 1 ||
    entry.highestLevelReached > TOTAL_LEVELS
  ) {
    return 'Invalid level reached.';
  }

  for (const [key, val] of [
    ['enemiesKilled', entry.enemiesKilled],
    ['bossesDefeated', entry.bossesDefeated],
    ['mergedTowersCreated', entry.mergedTowersCreated],
    ['maxLevelTowersCreated', entry.maxLevelTowersCreated],
  ] as const) {
    if (!Number.isInteger(val) || val < 0 || val > MAX_STAT) {
      return `Invalid ${key}.`;
    }
  }

  return null;
}

export function clampSubmission(entry: ScoreSubmission): ScoreSubmission {
  return {
    playerName: sanitizePlayerName(entry.playerName),
    score: Math.max(1, Math.floor(entry.score)),
    difficulty: entry.difficulty,
    highestLevelReached: Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(entry.highestLevelReached))),
    victory: Boolean(entry.victory),
    enemiesKilled: Math.min(MAX_STAT, Math.max(0, Math.floor(entry.enemiesKilled))),
    bossesDefeated: Math.min(MAX_STAT, Math.max(0, Math.floor(entry.bossesDefeated))),
    mergedTowersCreated: Math.min(MAX_STAT, Math.max(0, Math.floor(entry.mergedTowersCreated))),
    maxLevelTowersCreated: Math.min(MAX_STAT, Math.max(0, Math.floor(entry.maxLevelTowersCreated))),
  };
}
