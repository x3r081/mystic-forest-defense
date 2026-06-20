import { SupabaseHighScoreService } from './SupabaseHighScoreService';
import { LocalHighScoreService } from './LocalHighScoreService';
import type { HighScoreService } from './types';

export type { HighScoreService, LeaderboardEntry, ScoreSubmission } from './types';
export { validatePlayerName, validateScoreSubmission, sanitizePlayerName } from './validation';

export function isOnlineLeaderboardConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.length > 0 && key.length > 0);
}

let cached: HighScoreService | null = null;

export function getHighScoreService(): HighScoreService {
  if (cached) return cached;

  if (isOnlineLeaderboardConfigured()) {
    cached = new SupabaseHighScoreService(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
    );
  } else {
    cached = new LocalHighScoreService();
  }

  return cached;
}

/** Reset cached service (tests / env hot reload). */
export function resetHighScoreServiceCache(): void {
  cached = null;
}
