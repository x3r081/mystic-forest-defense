import { useEffect, useMemo, useState } from 'react';
import type { DifficultyId } from '../data/difficulties';
import { getDifficulty } from '../data/difficulties';
import { useGameStore } from '../game/store';
import {
  getHighScoreService,
  isOnlineLeaderboardConfigured,
  type LeaderboardEntry,
} from '../services/highScore';
import styles from './LeaderboardScreen.module.css';

type DifficultyFilter = 'all' | DifficultyId;

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

const FILTERS: { id: DifficultyFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export function LeaderboardScreen() {
  const backToTitle = useGameStore((s) => s.backToTitle);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<DifficultyFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [fetchToken, setFetchToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const online = isOnlineLeaderboardConfigured();
  const service = getHighScoreService();

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await service.fetchTopScores(100);
        if (active) setEntries(rows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load leaderboard.');
          setEntries([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [service, fetchToken]);

  const filtered = useMemo(() => {
    const list =
      filter === 'all' ? entries : entries.filter((e) => e.difficulty === filter);
    return list.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  }, [entries, filter]);

  const visible = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <p className={styles.kicker}>Hall of Guardians</p>
        <h1 className={styles.title}>Global High Scores</h1>

        {!online && (
          <p className={styles.notice}>
            Online leaderboard not configured — showing local dev scores from this browser only.
          </p>
        )}

        <div className={styles.filters} role="tablist" aria-label="Difficulty filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`${styles.filterBtn} ${filter === f.id ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p className={styles.status}>Consulting the ancient records…</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!loading && !error && visible.length === 0 && (
          <p className={styles.status}>No scores yet — be the first to defend the grove!</p>
        )}

        {!loading && visible.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Diff</th>
                  <th>Level</th>
                  <th>Result</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr key={row.id} className={i < 3 ? styles.topRow : undefined}>
                    <td>{i + 1}</td>
                    <td className={styles.playerCell}>{row.playerName}</td>
                    <td className={styles.scoreCell}>{row.score.toLocaleString()}</td>
                    <td>{getDifficulty(row.difficulty).label}</td>
                    <td>{row.highestLevelReached}</td>
                    <td>
                      <span className={row.victory ? styles.victory : styles.defeat}>
                        {row.victory ? 'Victory' : 'Defeat'}
                      </span>
                    </td>
                    <td className={styles.dateCell}>{formatDate(row.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 10 && (
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Show top 10' : `Show all ${Math.min(filtered.length, 100)} scores`}
          </button>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => setFetchToken((t) => t + 1)}>
            Refresh
          </button>
          <button type="button" className={styles.primary} onClick={backToTitle}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
