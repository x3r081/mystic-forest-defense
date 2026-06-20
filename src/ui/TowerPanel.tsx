import type { CSSProperties } from 'react';
import { useGameStore, canEditTowers } from '../game/store';
import { shopTowers, getTowerDef } from '../data/towerRegistry';
import type { TowerDef } from '../data/gameConfig';
import styles from './TowerPanel.module.css';

function fireRate(cooldown: number): string {
  return `${(1 / cooldown).toFixed(1)}/s`;
}

function specialEffect(t: TowerDef): string | null {
  if (t.splashRadius) return `Splash damage in a ${t.splashRadius.toFixed(1)} radius.`;
  if (t.slow) return `Slows enemies to ${Math.round(t.slow.factor * 100)}% speed for ${t.slow.duration}s.`;
  if (t.dot) return `Burns for ${t.dot.dps} damage/s over ${t.dot.duration}s.`;
  return null;
}

function Tooltip({ tower }: { tower: TowerDef }) {
  const special = specialEffect(tower);
  return (
    <div className={styles.tooltip} role="tooltip">
      <div className={styles.tooltipHead}>
        <span className={styles.tooltipIcon}>{tower.icon}</span>
        <div>
          <div className={styles.tooltipName}>{tower.name}</div>
          <div className={styles.tooltipTrait}>{tower.trait}</div>
        </div>
        <span className={styles.tooltipCost}>
          <span className={styles.coinIcon}>◈</span>
          {tower.cost}
        </span>
      </div>
      <p className={styles.tooltipDesc}>{tower.description}</p>
      <div className={styles.tooltipStats}>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Damage</span>
          <span className={styles.tooltipStatValue}>{tower.damage}</span>
        </div>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Range</span>
          <span className={styles.tooltipStatValue}>{tower.range.toFixed(1)}</span>
        </div>
        <div className={styles.tooltipStat}>
          <span className={styles.tooltipStatLabel}>Fire rate</span>
          <span className={styles.tooltipStatValue}>{fireRate(tower.cooldown)}</span>
        </div>
      </div>
      {special && <p className={styles.tooltipSpecial}>{special}</p>}
    </div>
  );
}

export function TowerPanel() {
  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused);
  const coins = useGameStore((s) => s.coins);
  const selectedTower = useGameStore((s) => s.selectedTower);
  const selectedPlacedId = useGameStore((s) => s.selectedPlacedId);
  const selectShopTower = useGameStore((s) => s.selectShopTower);

  const canBuild = canEditTowers({ screen, phase });
  const selectedDef = getTowerDef(selectedTower) ?? null;

  let hint = 'Select a tower, then click open ground to place.';
  let hintActive = false;
  if (paused) {
    hint = 'Paused — build, upgrade, sell, or merge freely.';
    hintActive = true;
  } else if (phase === 'running') {
    hint = 'Wave active — you can still build and manage towers.';
  }
  if (selectedPlacedId != null) {
    hintActive = true;
    hint = 'Tower selected — use the details panel to upgrade, sell, or merge.';
  } else if (selectedDef) {
    hintActive = true;
    hint =
      coins >= selectedDef.cost
        ? `Click open ground to place ${selectedDef.name}.`
        : `Not enough coins for ${selectedDef.name}.`;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.heading}>Build Towers</span>
        <span className={styles.coins}>
          <span className={styles.coinIcon}>◈</span>
          {coins}
        </span>
      </div>

      {canBuild && (
        <div className={styles.cards}>
          {shopTowers.map((t) => {
            const affordable = coins >= t.cost;
            const selected = selectedTower === t.id;
            const className = [
              styles.card,
              selected ? styles.cardSelected : '',
              !affordable ? styles.cardDisabled : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={t.id}
                type="button"
                className={className}
                style={{ '--gem': t.color } as CSSProperties}
                onClick={() => selectShopTower(t.id)}
                aria-label={`${t.name}, ${t.cost} coins`}
              >
                <span className={styles.gem}>
                  <span className={styles.gemIcon}>{t.icon}</span>
                </span>
                <span className={styles.info}>
                  <span className={styles.nameRow}>
                    <span className={styles.name}>{t.name}</span>
                    <span className={`${styles.cost} ${!affordable ? styles.costInsufficient : ''}`}>
                      <span className={styles.coinIcon}>◈</span>
                      {t.cost}
                    </span>
                  </span>
                  <span className={styles.statRow}>
                    <span className={styles.stat} title="Damage">
                      <span className={styles.statGlyph}>✷</span>
                      {t.damage}
                    </span>
                    <span className={styles.stat} title="Range">
                      <span className={styles.statGlyph}>◎</span>
                      {t.range.toFixed(1)}
                    </span>
                    <span className={styles.stat} title="Fire rate">
                      <span className={styles.statGlyph}>⟳</span>
                      {fireRate(t.cooldown)}
                    </span>
                  </span>
                </span>
                <Tooltip tower={t} />
              </button>
            );
          })}
        </div>
      )}

      <p className={`${styles.hint} ${hintActive ? styles.hintActive : ''}`}>{hint}</p>
    </div>
  );
}
