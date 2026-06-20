import type { DifficultyId } from '../../data/difficulties';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  difficulty: DifficultyId;
  highestLevelReached: number;
  victory: boolean;
  date: string;
  enemiesKilled: number;
  bossesDefeated: number;
  mergedTowersCreated: number;
  maxLevelTowersCreated: number;
}

export interface ScoreSubmission {
  playerName: string;
  score: number;
  difficulty: DifficultyId;
  highestLevelReached: number;
  victory: boolean;
  enemiesKilled: number;
  bossesDefeated: number;
  mergedTowersCreated: number;
  maxLevelTowersCreated: number;
}

export type LeaderboardMode = 'online' | 'local';

export interface HighScoreService {
  readonly mode: LeaderboardMode;
  readonly isOnline: boolean;
  fetchTopScores(limit?: number): Promise<LeaderboardEntry[]>;
  submitScore(entry: ScoreSubmission): Promise<LeaderboardEntry>;
}
