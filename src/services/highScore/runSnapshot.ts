import type { DifficultyId } from '../../data/difficulties';
import { computeRunScore, highestLevelForRun } from '../../data/scoreCalc';
import type { RunStats } from '../../game/store';

const PLAYER_NAME_KEY = 'mff-player-name';

export function loadSavedPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY)?.trim().slice(0, 16) ?? '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name.trim().slice(0, 16));
  } catch {
    /* ignore quota errors */
  }
}

export interface RunEndSnapshot {
  runId: string;
  difficulty: DifficultyId;
  level: number;
  victory: boolean;
  coins: number;
  lives: number;
  stats: RunStats;
}

export function buildScoreSubmission(snapshot: RunEndSnapshot, playerName: string) {
  const highestLevelReached = highestLevelForRun(snapshot.level, snapshot.victory);
  const score = computeRunScore({
    difficulty: snapshot.difficulty,
    highestLevelReached,
    victory: snapshot.victory,
    coins: snapshot.coins,
    lives: snapshot.lives,
    enemiesKilled: snapshot.stats.enemiesKilled,
    bossesDefeated: snapshot.stats.bossesDefeated,
    mergedTowersCreated: snapshot.stats.mergedTowersCreated,
    maxLevelTowersCreated: snapshot.stats.maxLevelTowersCreated,
  });

  return {
    playerName,
    score,
    difficulty: snapshot.difficulty,
    highestLevelReached,
    victory: snapshot.victory,
    enemiesKilled: snapshot.stats.enemiesKilled,
    bossesDefeated: snapshot.stats.bossesDefeated,
    mergedTowersCreated: snapshot.stats.mergedTowersCreated,
    maxLevelTowersCreated: snapshot.stats.maxLevelTowersCreated,
  };
}

export function snapshotFromStore(state: {
  runStats: RunStats;
  selectedDifficulty: DifficultyId;
  level: number;
  coins: number;
  lives: number;
}, victory: boolean): RunEndSnapshot {
  return {
    runId: state.runStats.runId,
    difficulty: state.selectedDifficulty,
    level: state.level,
    victory,
    coins: state.coins,
    lives: state.lives,
    stats: state.runStats,
  };
}
