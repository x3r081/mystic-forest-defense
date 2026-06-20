import { useGameStore } from '../game/store';
import { getMap, getMapForLevel } from '../data/maps';
import { getMapTransitionBonus } from '../data/campaignConfig';
import styles from './LevelTransition.module.css';

/** Shown when entering a new map (every 10 levels). */
export function MapTransitionScreen() {
  const level = useGameStore((s) => s.level);
  const coins = useGameStore((s) => s.coins);
  const lives = useGameStore((s) => s.lives);
  const mapId = useGameStore((s) => s.mapId);
  const diff = useGameStore((s) => s.difficultyConfig);
  const continueToMap = useGameStore((s) => s.continueToMap);

  const map = getMap(mapId);
  const bonus = getMapTransitionBonus(diff, level);

  return (
    <div className={styles.root}>
      <div className={`${styles.panel} ${styles.panelMap}`}>
        <p className={styles.kicker}>Level {level} · New Territory</p>
        <h1 className={styles.title}>{map.name}</h1>
        <p className={styles.subtitle}>{map.introText}</p>
        <p className={styles.subtitle}>
          Your towers must be rebuilt, but coins and lives carry forward (+{bonus} travel bonus).
        </p>

        <div className={styles.stats}>
          <div className={styles.statCell}>
            <span className={styles.statNum}>{coins}</span>
            <span className={styles.statCaption}>Coins</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNum}>{lives}</span>
            <span className={styles.statCaption}>Lives</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={continueToMap} type="button">
            Enter {getMapForLevel(level).name}
          </button>
        </div>
      </div>
    </div>
  );
}
