import { useGameStore } from '../game/store';
import { gameConfig } from '../data/gameConfig';
import { TOTAL_LEVELS, MAP_COUNT } from '../data/campaignConfig';
import styles from './StartScreen.module.css';

export function StartScreen() {
  const openDifficultySelect = useGameStore((s) => s.openDifficultySelect);
  const openLeaderboard = useGameStore((s) => s.openLeaderboard);

  const [first, ...rest] = gameConfig.title.split(' ');

  return (
    <div className={styles.root}>
      <div className={styles.titleBlock}>
        <p className={styles.kicker}>An Arcane Tower Defense</p>
        <h1 className={styles.title}>
          {first} <span className={styles.accent}>{rest.join(' ')}</span>
        </h1>
        <p className={styles.tagline}>{gameConfig.tagline}</p>
      </div>

      <button className={styles.playButton} onClick={openDifficultySelect} type="button">
        Play
      </button>

      <button className={styles.scoresButton} onClick={openLeaderboard} type="button">
        High Scores
      </button>

      <p className={styles.hint}>{TOTAL_LEVELS} levels · {MAP_COUNT} mystic maps · Three difficulties</p>
    </div>
  );
}
