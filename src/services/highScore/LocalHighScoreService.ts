import type { HighScoreService, LeaderboardEntry, ScoreSubmission } from './types';
import { clampSubmission, validateScoreSubmission } from './validation';

const STORAGE_KEY = 'mff-local-leaderboard';

function loadEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: LeaderboardEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 100)));
}

/** Dev fallback when Supabase env vars are missing — not shared across players. */
export class LocalHighScoreService implements HighScoreService {
  readonly mode = 'local' as const;
  readonly isOnline = false;

  async fetchTopScores(limit = 100): Promise<LeaderboardEntry[]> {
    return loadEntries()
      .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
      .slice(0, limit);
  }

  async submitScore(raw: ScoreSubmission): Promise<LeaderboardEntry> {
    const entry = clampSubmission(raw);
    const err = validateScoreSubmission(entry);
    if (err) throw new Error(err);

    const row: LeaderboardEntry = {
      id: crypto.randomUUID(),
      playerName: entry.playerName,
      score: entry.score,
      difficulty: entry.difficulty,
      highestLevelReached: entry.highestLevelReached,
      victory: entry.victory,
      date: new Date().toISOString(),
      enemiesKilled: entry.enemiesKilled,
      bossesDefeated: entry.bossesDefeated,
      mergedTowersCreated: entry.mergedTowersCreated,
      maxLevelTowersCreated: entry.maxLevelTowersCreated,
    };

    const next = [...loadEntries(), row]
      .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
      .slice(0, 100);
    saveEntries(next);
    return row;
  }
}
