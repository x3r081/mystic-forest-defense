import { useGameStore } from '../game/store';
import { getLevel, TOTAL_LEVELS } from '../data/levels';
import { isMapTransition, getMapForLevel } from '../data/maps';
import { getFinalBossName } from '../data/campaignConfig';
import { ScoreSubmitPanel } from './ScoreSubmitPanel';
import styles from './LevelTransition.module.css';

export function LevelCompleteScreen() {
  const level = useGameStore((s) => s.level);
  const coins = useGameStore((s) => s.coins);
  const coinsThisLevel = useGameStore((s) => s.coinsThisLevel);
  const lives = useGameStore((s) => s.lives);
  const nextLevel = useGameStore((s) => s.nextLevel);
  const goToMenu = useGameStore((s) => s.goToMenu);

  const cleared = getLevel(level);
  const upcoming = getLevel(Math.min(level + 1, TOTAL_LEVELS));
  const nextIsBoss = !!upcoming.boss;
  const nextIsFinal = level + 1 === TOTAL_LEVELS;
  const mapChanges = isMapTransition(level);
  const nextMap = getMapForLevel(level + 1);

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <p className={styles.kicker}>Level {level} Cleared</p>
        <h1 className={styles.title}>{cleared.name}</h1>
        <p className={styles.subtitle}>
          Next: Level {level + 1} · {upcoming.name}
          {nextIsFinal ? ' — the final boss awaits' : nextIsBoss ? ' — boss encounter' : ''}
          {mapChanges && nextMap ? ` · entering ${nextMap.name}` : ''}
        </p>

        <div className={styles.stats}>
          <div className={styles.statCell}>
            <span className={`${styles.statNum} ${styles.statNumWarm}`}>+{coinsThisLevel}</span>
            <span className={styles.statCaption}>Coins Earned</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNum}>{coins}</span>
            <span className={styles.statCaption}>Total Coins</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNum}>{lives}</span>
            <span className={styles.statCaption}>Lives Left</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={nextLevel} type="button">
            {mapChanges ? `Travel to ${nextMap?.name ?? 'Next Map'}` : 'Start Next Level'}
          </button>
          <button className={styles.secondary} onClick={goToMenu} type="button">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function VictoryScreen() {
  const coins = useGameStore((s) => s.coins);
  const lives = useGameStore((s) => s.lives);
  const runId = useGameStore((s) => s.runStats.runId);
  const diff = useGameStore((s) => s.difficultyConfig);
  const startGame = useGameStore((s) => s.startGame);
  const goToMenu = useGameStore((s) => s.goToMenu);

  return (
    <div className={styles.root}>
      <div className={`${styles.panel} ${styles.panelVictory} ${styles.panelWide}`}>
        <p className={`${styles.kicker} ${styles.kickerVictory}`}>Victory</p>
        <h1 className={styles.title}>The Ancient Forest Endures</h1>
        <p className={styles.subtitle}>
          You cleared all {TOTAL_LEVELS} levels on {diff.label} difficulty and defeated {getFinalBossName()}.
        </p>

        <div className={styles.stats}>
          <div className={styles.statCell}>
            <span className={`${styles.statNum} ${styles.statNumWarm}`}>{coins}</span>
            <span className={styles.statCaption}>Coins Hoarded</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNum}>{lives}</span>
            <span className={styles.statCaption}>Lives Left</span>
          </div>
        </div>

        <ScoreSubmitPanel key={runId} victory />

        <div className={styles.actions}>
          <button className={`${styles.primary} ${styles.primaryVictory}`} onClick={startGame} type="button">
            Play Again
          </button>
          <button className={styles.secondary} onClick={goToMenu} type="button">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
