import { useGameStore, canEditTowers } from '../game/store';
import { getTowerDef, isHybridDef } from '../data/towerRegistry';
import { statsForPlaced, getUpgradeCost, getSellRefund } from '../data/towerStats';
import { getMergeCandidates, mergeCostFor } from '../data/mergeUtils';
import styles from './TowerDetailsPanel.module.css';

function fireRate(cooldown: number): string {
  return `${(1 / cooldown).toFixed(1)}/s`;
}

export function TowerDetailsPanel() {
  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);
  const coins = useGameStore((s) => s.coins);
  const selectedPlacedId = useGameStore((s) => s.selectedPlacedId);
  const placedTowers = useGameStore((s) => s.placedTowers);
  const selectPlacedTower = useGameStore((s) => s.selectPlacedTower);
  const upgradePlacedTower = useGameStore((s) => s.upgradePlacedTower);
  const sellPlacedTower = useGameStore((s) => s.sellPlacedTower);
  const mergePlacedTowers = useGameStore((s) => s.mergePlacedTowers);

  if (!canEditTowers({ screen, phase }) || selectedPlacedId == null) return null;

  const tower = placedTowers.find((t) => t.id === selectedPlacedId);
  if (!tower) return null;

  const def = getTowerDef(tower.towerId);
  const stats = statsForPlaced(tower.towerId, tower.level);
  if (!def || !stats) return null;

  const upgradeCost = stats.isMax ? Infinity : getUpgradeCost(tower.towerId, tower.level);
  const canAffordUpgrade = upgradeCost !== Infinity && coins >= upgradeCost;
  const refund = getSellRefund(tower.investedCoins);
  const mergePartners = getMergeCandidates(tower, placedTowers);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>
            {stats.isHybrid ? 'Hybrid Tower' : 'Tower Details'}
          </span>
          <h2 className={styles.title} style={{ color: def.color }}>
            {def.icon} {def.name}
          </h2>
          {isHybridDef(def) && <p className={styles.power}>{def.power}</p>}
        </div>
        <button type="button" className={styles.close} onClick={() => selectPlacedTower(null)} aria-label="Close">
          ×
        </button>
      </div>

      <div className={styles.levelBadge}>
        Level {stats.level}
        <span className={styles.levelRoman}> / {stats.maxLevel} ({stats.isMax ? 'MAX' : stats.levelLabel})</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Damage</span>
          <span className={styles.statValue}>{stats.damage}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Range</span>
          <span className={styles.statValue}>{stats.range.toFixed(1)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Fire rate</span>
          <span className={styles.statValue}>{fireRate(stats.cooldown)}</span>
        </div>
      </div>

      {stats.splashRadius && (
        <p className={styles.special}>Splash radius {stats.splashRadius.toFixed(1)}</p>
      )}
      {stats.slow && (
        <p className={styles.special}>
          Slows to {Math.round(stats.slow.factor * 100)}% for {stats.slow.duration.toFixed(1)}s
        </p>
      )}
      {stats.dot && (
        <p className={styles.special}>
          Burns {stats.dot.dps} DPS for {stats.dot.duration.toFixed(1)}s
        </p>
      )}

      <div className={styles.actions}>
        {stats.isMax ? (
          <button type="button" className={styles.btnMax} disabled>
            MAX Level
          </button>
        ) : (
          <button
            type="button"
            className={styles.btnUpgrade}
            disabled={!canAffordUpgrade}
            onClick={() => upgradePlacedTower(tower.id)}
          >
            Upgrade ◈ {upgradeCost === Infinity ? '—' : upgradeCost}
          </button>
        )}
        <button type="button" className={styles.btnSell} onClick={() => sellPlacedTower(tower.id)}>
          Sell +{refund}
        </button>
      </div>

      {mergePartners.length > 0 && (
        <div className={styles.mergeSection}>
          <span className={styles.mergeLabel}>Merge partners (Lv {3}+ nearby)</span>
          <div className={styles.mergeList}>
            {mergePartners.map((partner) => {
              const pDef = getTowerDef(partner.towerId);
              const cost = mergeCostFor(tower, partner)!;
              const affordable = coins >= cost;
              return (
                <button
                  key={partner.id}
                  type="button"
                  className={styles.mergeBtn}
                  disabled={!affordable}
                  onClick={() => mergePlacedTowers(tower.id, partner.id)}
                >
                  <span>{pDef?.icon} {pDef?.name} Lv{partner.level}</span>
                  <span className={styles.mergeCost}>◈ {cost}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
