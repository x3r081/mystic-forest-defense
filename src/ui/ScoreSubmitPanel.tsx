import { useMemo, useState } from 'react';
import { useGameStore } from '../game/store';
import {
  getHighScoreService,
  isOnlineLeaderboardConfigured,
  validatePlayerName,
} from '../services/highScore';
import {
  buildScoreSubmission,
  loadSavedPlayerName,
  savePlayerName,
  snapshotFromStore,
} from '../services/highScore/runSnapshot';
import styles from './ScoreSubmitPanel.module.css';

interface ScoreSubmitPanelProps {
  victory: boolean;
}

export function ScoreSubmitPanel({ victory }: ScoreSubmitPanelProps) {
  const state = useGameStore();
  const [playerName, setPlayerName] = useState(loadSavedPlayerName);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [submittedForRunId, setSubmittedForRunId] = useState<string | null>(null);

  const snapshot = useMemo(
    () =>
      snapshotFromStore(
        {
          runStats: state.runStats,
          selectedDifficulty: state.selectedDifficulty,
          level: state.level,
          coins: state.coins,
          lives: state.lives,
        },
        victory,
      ),
    [state.runStats, state.selectedDifficulty, state.level, state.coins, state.lives, victory],
  );

  const preview = useMemo(
    () => buildScoreSubmission(snapshot, playerName || 'Player'),
    [snapshot, playerName],
  );

  const online = isOnlineLeaderboardConfigured();
  const service = getHighScoreService();
  const alreadySubmitted = submittedForRunId === snapshot.runId;

  const handleSubmit = async () => {
    if (alreadySubmitted || status === 'submitting') return;

    const nameErr = validatePlayerName(playerName);
    if (nameErr) {
      setStatus('error');
      setMessage(nameErr);
      return;
    }

    setStatus('submitting');
    setMessage('');

    try {
      const submission = buildScoreSubmission(snapshot, playerName);
      await service.submitScore(submission);
      savePlayerName(playerName);
      setSubmittedForRunId(snapshot.runId);
      setStatus('success');
      setMessage(
        online
          ? 'Score posted to the global leaderboard!'
          : 'Score saved to local dev leaderboard (Supabase not configured).',
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not submit score.');
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.kicker}>{victory ? 'Campaign Complete' : 'Run Summary'}</p>
      <h2 className={styles.title}>Submit Your Score</h2>

      {!online && (
        <p className={styles.notice}>
          Online leaderboard not configured — scores save locally on this device only.
        </p>
      )}

      <div className={styles.scorePreview}>
        <span className={styles.scoreLabel}>Score</span>
        <span className={styles.scoreValue}>{preview.score.toLocaleString()}</span>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Level</span>
          <span className={styles.metaValue}>{preview.highestLevelReached}</span>
        </div>
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Kills</span>
          <span className={styles.metaValue}>{preview.enemiesKilled}</span>
        </div>
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Bosses</span>
          <span className={styles.metaValue}>{preview.bossesDefeated}</span>
        </div>
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Merges</span>
          <span className={styles.metaValue}>{preview.mergedTowersCreated}</span>
        </div>
      </div>

      <label className={styles.nameField}>
        <span className={styles.nameLabel}>Guardian name (1–16 chars)</span>
        <input
          className={styles.nameInput}
          type="text"
          maxLength={16}
          value={playerName}
          disabled={alreadySubmitted || status === 'submitting'}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
        />
      </label>

      <button
        type="button"
        className={styles.submitBtn}
        disabled={alreadySubmitted || status === 'submitting'}
        onClick={handleSubmit}
      >
        {alreadySubmitted ? 'Score Submitted' : status === 'submitting' ? 'Submitting…' : 'Post Score'}
      </button>

      {message && (
        <p className={`${styles.feedback} ${status === 'error' ? styles.feedbackError : styles.feedbackOk}`}>
          {message}
        </p>
      )}
    </div>
  );
}
