import { useGameStore } from '../game/store';
import { canStartLevel, describeStartLevel } from '../game/gameDebug';
import { getLevel, TOTAL_LEVELS } from '../data/levels';
import { getEffectiveLevel } from '../data/levelUtils';
import { getMap, isBossLevel } from '../data/maps';
import { enemyTypes, type EnemyKind } from '../data/gameConfig';
import styles from './Modals.module.css';

function levelEnemies(level: number, diff: ReturnType<typeof useGameStore.getState>['difficultyConfig']): EnemyKind[] {
  const seen = new Set<EnemyKind>();
  for (const k of getEffectiveLevel(level, diff).enemyKinds) seen.add(k);
  if (getLevel(level).boss) seen.add('corruptor');
  return [...seen];
}

function PrepareCard() {
  const level = useGameStore((s) => s.level);
  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);
  const totalEnemies = useGameStore((s) => s.totalEnemies);
  const coins = useGameStore((s) => s.coins);
  const placedTowers = useGameStore((s) => s.placedTowers);
  const diff = useGameStore((s) => s.difficultyConfig);
  const mapId = useGameStore((s) => s.mapId);
  const startRun = useGameStore((s) => s.startRun);

  const def = getLevel(level);
  const boss = def.boss;
  const roster = levelEnemies(level, diff);
  const isFinalBoss = level === TOTAL_LEVELS && !!boss;
  const isBoss = isBossLevel(level);
  const map = getMap(mapId);

  const flavor = def.introText ?? `Round ${level} on ${map.name}. Place and upgrade towers, then begin the wave.`;

  let startLabel = 'Start Level';
  if (isFinalBoss) startLabel = 'Begin Final Boss Battle';
  else if (isBoss) startLabel = 'Begin Boss Battle';

  return (
    <div className={`${styles.prepareOverlay} ${boss ? styles.overlayBoss : ''}`}>
      <div className={`${styles.panel} ${styles.prepareCard} ${boss ? styles.panelBoss : ''}`}>
        <span className={`${styles.kicker} ${boss ? styles.kickerBoss : ''}`}>
          {isFinalBoss ? '⚠ Final Boss' : isBoss ? '⚠ Boss Encounter' : `Level ${level} · ${map.name}`}
        </span>
        <h2 className={`${styles.title} ${boss ? styles.titleBoss : ''}`}>
          {boss ? boss.name : def.name}
        </h2>
        <p className={styles.flavor}>{flavor}</p>

        <div className={styles.metaGrid}>
          <div className={styles.metaCell}>
            <span className={styles.metaLabel}>Difficulty</span>
            <span className={styles.metaValue}>{diff.label}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLabel}>Incoming</span>
            <span className={styles.metaValue}>{totalEnemies} foes</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLabel}>Coins</span>
            <span className={styles.metaValue}>◈ {coins}</span>
          </div>
          <div className={styles.metaCell}>
            <span className={styles.metaLabel}>Towers</span>
            <span className={styles.metaValue}>{placedTowers.length} placed</span>
          </div>
        </div>

        <div className={styles.roster}>
          <span className={styles.rosterLabel}>You will face</span>
          <div className={styles.rosterChips}>
            {roster.map((k) => (
              <span
                key={k}
                className={styles.rosterChip}
                style={{ '--chip': enemyTypes[k].color } as React.CSSProperties}
              >
                <span className={styles.rosterDot} />
                {enemyTypes[k].name}
              </span>
            ))}
          </div>
        </div>

        {isBoss && (
          <p className={styles.objective}>
            {map.bossName} drains <strong>all remaining lives</strong> if it reaches the portal.
          </p>
        )}
        {!boss && (
          <p className={styles.objective}>
            Build anytime: place towers, upgrade with coins, or merge two different Lv3+ towers nearby — even during waves.
          </p>
        )}

        <button
          type="button"
          className={`${styles.primaryButton} ${boss ? styles.primaryButtonBoss : ''}`}
          disabled={!canStartLevel({ screen, phase })}
          title={describeStartLevel({ screen, phase })}
          onClick={startRun}
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}

export function GameModals() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'preparing') return <PrepareCard />;
  return null;
}
