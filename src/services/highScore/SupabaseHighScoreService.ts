import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { HighScoreService, LeaderboardEntry, ScoreSubmission } from './types';
import { clampSubmission, validateScoreSubmission } from './validation';

const TABLE = 'leaderboard';

interface LeaderboardRow {
  id: string;
  player_name: string;
  score: number;
  difficulty: string;
  highest_level_reached: number;
  victory: boolean;
  enemies_killed: number;
  bosses_defeated: number;
  merged_towers_created: number;
  max_level_towers_created: number;
  created_at: string;
}

function rowToEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    id: row.id,
    playerName: row.player_name,
    score: row.score,
    difficulty: row.difficulty as LeaderboardEntry['difficulty'],
    highestLevelReached: row.highest_level_reached,
    victory: row.victory,
    date: row.created_at,
    enemiesKilled: row.enemies_killed,
    bossesDefeated: row.bosses_defeated,
    mergedTowersCreated: row.merged_towers_created,
    maxLevelTowersCreated: row.max_level_towers_created,
  };
}

function submissionToRow(entry: ScoreSubmission) {
  return {
    player_name: entry.playerName,
    score: entry.score,
    difficulty: entry.difficulty,
    highest_level_reached: entry.highestLevelReached,
    victory: entry.victory,
    enemies_killed: entry.enemiesKilled,
    bosses_defeated: entry.bossesDefeated,
    merged_towers_created: entry.mergedTowersCreated,
    max_level_towers_created: entry.maxLevelTowersCreated,
  };
}

export class SupabaseHighScoreService implements HighScoreService {
  readonly mode = 'online' as const;
  readonly isOnline = true;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  async fetchTopScores(limit = 100): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data as LeaderboardRow[]).map(rowToEntry);
  }

  async submitScore(raw: ScoreSubmission): Promise<LeaderboardEntry> {
    const entry = clampSubmission(raw);
    const err = validateScoreSubmission(entry);
    if (err) throw new Error(err);

    const { data, error } = await this.client
      .from(TABLE)
      .insert(submissionToRow(entry))
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return rowToEntry(data as LeaderboardRow);
  }
}
