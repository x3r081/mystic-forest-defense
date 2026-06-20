import { useEffect, useRef, useState } from 'react';
import { useGameStore, SPEED_OPTIONS } from '../game/store';
import { getLevel, TOTAL_LEVELS } from '../data/levels';
import { getMap, getLevelInMap } from '../data/maps';
import { ACT_PROGRESS_SEGMENTS, getActProgressSegment, LEVELS_PER_MAP } from '../data/campaignConfig';
import { TowerPanel } from './TowerPanel';
import { TowerDetailsPanel } from './TowerDetailsPanel';
import { GameModals } from './Modals';
import styles from './GameHUD.module.css';

function SpeedControls() {
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const setGameSpeed = useGameStore((s) => s.setGameSpeed);
  return (
    <div className={styles.speedGroup} role="group" aria-label="Game speed">
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          className={`${styles.speedButton} ${gameSpeed === s ? styles.speedButtonActive : ''}`}
          onClick={() => setGameSpeed(s)}
          aria-pressed={gameSpeed === s}
          title={`${s}× speed`}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}

function phaseStatus(phase: 'preparing' | 'running', paused: boolean): string {
  if (phase === 'preparing') return 'Preparing';
  if (paused) return 'Paused';
  return 'Wave active';
}

export function GameHUD() {
  const coins = useGameStore((s) => s.coins);
  const lives = useGameStore((s) => s.lives);
  const level = useGameStore((s) => s.level);
  const mapId = useGameStore((s) => s.mapId);
  const diff = useGameStore((s) => s.difficultyConfig);
  const clearedCount = useGameStore((s) => s.clearedCount);
  const totalEnemies = useGameStore((s) => s.totalEnemies);
  const enemiesAlive = useGameStore((s) => s.enemies.length);
  const bossOnField = useGameStore((s) => s.enemies.some((e) => e.isBoss));
  const phase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused);
  const pauseRun = useGameStore((s) => s.pauseRun);
  const resumeRun = useGameStore((s) => s.resumeRun);
  const startGame = useGameStore((s) => s.startGame);
  const goToMenu = useGameStore((s) => s.goToMenu);

  const def = getLevel(level);
  const mapName = getMap(mapId).name;
  const isBoss = !!def.boss;
  const isFinalBoss = level === TOTAL_LEVELS && isBoss;
  const progress = totalEnemies > 0 ? Math.min(1, clearedCount / totalEnemies) : 0;
  const status = phaseStatus(phase, paused);
  const waveRunning = phase === 'running' && !paused;

  const [bossBanner, setBossBanner] = useState(false);
  const sawBoss = useRef(false);
  useEffect(() => {
    if (bossOnField && !sawBoss.current) {
      sawBoss.current = true;
      setBossBanner(true);
      const t = setTimeout(() => setBossBanner(false), 4200);
      return () => clearTimeout(t);
    }
    if (!bossOnField) sawBoss.current = false;
  }, [bossOnField]);

  return (
    <div className={`${styles.hud} ${paused ? styles.hudPaused : ''}`}>
      {bossBanner && (
        <div className={styles.bossBanner}>
          <span className={styles.bossBannerKicker}>
            {isFinalBoss ? 'The final guardian awakens' : 'A great darkness stirs'}
          </span>
          <span className={styles.bossBannerTitle}>{def.boss?.name ?? 'Boss'}</span>
        </div>
      )}
      <div className={styles.topBar}>
        <div className={styles.resourceGroup}>
          <div className={styles.stat}>
            <span className={`${styles.icon} ${styles.coinIcon}`}>◈</span>
            <span className={styles.statText}>
              <span className={styles.statLabel}>Coins</span>
              <span className={styles.statValue}>{coins}</span>
            </span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.icon} ${styles.lifeIcon}`}>❤</span>
            <span className={styles.statText}>
              <span className={styles.statLabel}>Lives</span>
              <span className={styles.statValue}>{lives}</span>
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statText}>
              <span className={styles.statLabel}>Difficulty</span>
              <span className={styles.statValue}>{diff.label}</span>
            </span>
          </div>
        </div>

        <div className={styles.spacer} />

        <div className={`${styles.levelBadge} ${isBoss ? styles.levelBadgeBoss : ''}`}>
          <span className={styles.levelLabel}>{isBoss ? 'Boss' : 'Round'}</span>
          <span className={styles.levelValue}>
            {level}
            <span className={styles.levelTotal}>/{TOTAL_LEVELS}</span>
          </span>
        </div>

        <div className={`${styles.phaseStatus} ${paused ? styles.phaseStatusPaused : ''}`}>
          {status}
        </div>

        <div className={styles.controls}>
          <SpeedControls />
          {waveRunning && (
            <button
              className={styles.playPauseButton}
              onClick={pauseRun}
              type="button"
              title="Pause wave"
              aria-label="Pause"
            >
              ❚❚ Pause
            </button>
          )}
          {phase === 'running' && paused && (
            <button
              className={`${styles.playPauseButton} ${styles.playPauseButtonActive}`}
              onClick={resumeRun}
              type="button"
              title="Resume wave"
              aria-label="Resume"
            >
              ▶ Play
            </button>
          )}
          <button className={styles.iconButton} onClick={startGame} type="button" title="Restart run" aria-label="Restart run">
            ⟲
          </button>
          <button className={styles.menuButton} onClick={goToMenu} type="button">
            Menu
          </button>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <TowerPanel />
        <div className={`${styles.wavePanel} ${isBoss ? styles.wavePanelBoss : ''}`}>
          <div className={styles.waveHeader}>
            <span className={styles.waveTitle}>
              {isBoss && <span className={styles.bossTag}>BOSS</span>}
              {def.name}
            </span>
            <span className={styles.waveCount}>{mapName} · {enemiesAlive} on the path</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${isBoss ? styles.progressFillBoss : ''}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className={styles.waveDots}>
            {Array.from({ length: ACT_PROGRESS_SEGMENTS }).map((_, i) => {
              const segment = getActProgressSegment(level);
              const cls =
                i < segment
                  ? `${styles.dot} ${styles.dotDone}`
                  : i === segment
                    ? `${styles.dot} ${styles.dotActive}`
                    : styles.dot;
              return (
                <span
                  key={i}
                  className={cls}
                  title={`Act progress ${i + 1}/${ACT_PROGRESS_SEGMENTS} (level ${getLevelInMap(level)}/${LEVELS_PER_MAP})`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <GameModals />
      <TowerDetailsPanel />
    </div>
  );
}
