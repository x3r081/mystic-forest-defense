import { useGameStore } from '../game/store';
import { ScoreSubmitPanel } from './ScoreSubmitPanel';
import styles from './GameOverScreen.module.css';

/** Shown when the grove falls (lives reach zero). */
export function GameOverScreen() {
  const level = useGameStore((s) => s.level);
  const runId = useGameStore((s) => s.runStats.runId);
  const startGame = useGameStore((s) => s.startGame);
  const goToMenu = useGameStore((s) => s.goToMenu);

  return (
    <div className={styles.root}>
      <div className={`${styles.panel} ${styles.panelWide}`}>
        <h1 className={styles.title}>The Grove Has Fallen</h1>
        <p className={styles.subtitle}>
          The dark broke through at Level {level}.
        </p>

        <ScoreSubmitPanel key={runId} victory={false} />

        <div className={styles.actions}>
          <button className={styles.primary} onClick={startGame} type="button">
            Try Again
          </button>
          <button className={styles.secondary} onClick={goToMenu} type="button">
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
