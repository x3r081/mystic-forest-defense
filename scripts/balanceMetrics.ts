/**
 * Shared balance metrics for audit scripts.
 */
import { towers, enemyTypes } from '../src/data/gameConfig';
import { difficulties, type DifficultyDef, type DifficultyId } from '../src/data/difficulties';
import { getEffectiveLevel } from '../src/data/levelUtils';
import { TOTAL_LEVELS, LEVELS_PER_MAP, MAP_COUNT } from '../src/data/campaignConfig';
import { getLevelInMap, getMapIndex } from '../src/data/maps';
import { hybridTowers } from '../src/data/hybridTowers';
import { getEffectiveTowerStats } from '../src/data/towerStats';
import { getUpgradeCost, NORMAL_MAX_LEVEL } from '../src/data/towerUpgradeConfig';
import { getTowerDef } from '../src/data/towerRegistry';
import type { LevelDef } from '../src/data/levels';

export { TOTAL_LEVELS, LEVELS_PER_MAP, MAP_COUNT, difficulties };

export const DIFFICULTY_IDS: DifficultyId[] = ['easy', 'medium', 'hard'];

/** Rough sustained DPS including partial DoT uptime. */
export function estimateTowerDps(towerId: string, level: number): number {
  const def = getTowerDef(towerId);
  if (!def) return 0;
  const stats = getEffectiveTowerStats(def, level);
  let dps = stats.damage / stats.cooldown;
  if (stats.dot) {
    dps += (stats.dot.dps * stats.dot.duration * 0.55) / stats.cooldown;
  }
  if (stats.splashRadius) dps *= 1.18;
  if (stats.slow) dps *= 1.08;
  return dps;
}

export function totalUpgradeCost(towerId: string, targetLevel: number): number {
  let total = 0;
  for (let lv = 1; lv < targetLevel; lv++) {
    const cost = getUpgradeCost(towerId, lv);
    if (Number.isFinite(cost)) total += cost;
  }
  return total;
}

export function levelIncome(def: LevelDef): number {
  let total = def.enemyCount * def.coinReward;
  if (def.boss) total += def.boss.coinReward;
  if (def.miniBoss) total += def.miniBoss.coinReward;
  return total;
}

export function waveTotalHp(def: LevelDef): number {
  let total = 0;
  for (let i = 0; i < def.enemyCount; i++) {
    const kind = def.enemyKinds[i % def.enemyKinds.length];
    total += Math.round(def.enemyHealth * enemyTypes[kind].hpMul);
  }
  if (def.boss) total += def.boss.health;
  if (def.miniBoss) total += def.miniBoss.health;
  return total;
}

export function waveDurationEstimate(def: LevelDef): number {
  const count = def.enemyCount + (def.boss || def.miniBoss ? 1 : 0);
  return count * def.spawnRate + 18;
}

/** HP cleared per second needed to zero-leak (ignoring slow/DoT synergy). */
export function requiredClearDps(def: LevelDef): number {
  return waveTotalHp(def) / Math.max(12, waveDurationEstimate(def));
}

export interface MilestoneSample {
  level: number;
  levelInMap: number;
  mapIndex: number;
  enemyHealth: number;
  enemyCount: number;
  coinReward: number;
  income: number;
  waveHp: number;
  reqDps: number;
  bossHp?: number;
  miniBossHp?: number;
}

export function sampleLevel(level: number, diff: DifficultyDef): MilestoneSample {
  const def = getEffectiveLevel(level, diff);
  return {
    level,
    levelInMap: getLevelInMap(level),
    mapIndex: getMapIndex(level),
    enemyHealth: def.enemyHealth,
    enemyCount: def.enemyCount,
    coinReward: def.coinReward,
    income: levelIncome(def),
    waveHp: waveTotalHp(def),
    reqDps: requiredClearDps(def),
    bossHp: def.boss?.health,
    miniBossHp: def.miniBoss?.health,
  };
}

/** Key levels for tabular reports. */
export function reportSampleLevels(): number[] {
  const levels = new Set<number>([1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  for (let map = 1; map < MAP_COUNT; map++) {
    levels.add(map * LEVELS_PER_MAP);
    levels.add(map * LEVELS_PER_MAP + 1);
    levels.add(map * LEVELS_PER_MAP + 20);
  }
  levels.add(TOTAL_LEVELS);
  return [...levels].sort((a, b) => a - b);
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function pad(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}

export interface BalanceWarning {
  level: number;
  difficulty: DifficultyId;
  kind: string;
  message: string;
}

/** Heuristic warnings when wave HP outpaces expected player DPS. */
export function collectWarnings(diffId: DifficultyId): BalanceWarning[] {
  const diff = difficulties[diffId];
  const warnings: BalanceWarning[] = [];
  const baselineDps = estimateTowerDps('moon-archer', 3) * 4;

  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const def = getEffectiveLevel(level, diff);
    const req = requiredClearDps(def);
    const levelInMap = getLevelInMap(level);
    const mapIndex = getMapIndex(level);

    const expectedTowers = 3 + Math.floor(levelInMap / 8) + mapIndex * 1.5;
    const expectedLevel = levelInMap >= 20 ? 4 : levelInMap >= 12 ? 3 : 2;
    const playerDps = estimateTowerDps('moon-archer', expectedLevel) * expectedTowers * 0.85;

    if (levelInMap === 20 && playerDps < req * 0.72) {
      warnings.push({
        level,
        difficulty: diffId,
        kind: 'upgrade-gate',
        message: `Level ${level}: expected L${expectedLevel} towers may struggle (req ${fmt(req, 1)} vs ~${fmt(playerDps, 1)} DPS)`,
      });
    }

    if (def.miniBoss && playerDps * waveDurationEstimate(def) < def.miniBoss.health * 0.65) {
      warnings.push({
        level,
        difficulty: diffId,
        kind: 'mini-boss',
        message: `Level ${level}: mini-boss HP ${fmt(def.miniBoss.health)} may need upgrades (est DPS budget ${fmt(playerDps * waveDurationEstimate(def))})`,
      });
    }

    if (def.boss) {
      const bossBudget = playerDps * waveDurationEstimate(def) * (levelInMap === LEVELS_PER_MAP ? 1.4 : 1);
      if (bossBudget < def.boss.health * 0.55) {
        warnings.push({
          level,
          difficulty: diffId,
          kind: 'map-boss',
          message: `Level ${level}: map boss HP ${fmt(def.boss.health)} likely needs merges/max upgrades`,
        });
      }
    }

    if (req > baselineDps * 2.2 && level <= 15 && diffId === 'medium') {
      warnings.push({
        level,
        difficulty: diffId,
        kind: 'early-spike',
        message: `Level ${level}: early HP spike (req ${fmt(req, 1)} DPS)`,
      });
    }
  }

  return warnings;
}

export function printTowerDpsTable(): void {
  console.log('\n── Normal tower DPS by upgrade level ──');
  console.log(`${pad('Tower', 22)} ${['L1', 'L2', 'L3', 'L4', 'L5'].join('  ')}`);
  for (const t of towers) {
    const dps = Array.from({ length: NORMAL_MAX_LEVEL }, (_, i) =>
      estimateTowerDps(t.id, i + 1).toFixed(1),
    );
    console.log(`${pad(t.name, 22)} ${dps.join('  ')}`);
  }

  console.log('\n── Hybrid tower DPS by upgrade level ──');
  console.log(`${pad('Hybrid', 22)} L1    L2    L3`);
  for (const h of hybridTowers) {
    const dps = [1, 2, 3].map((lv) => estimateTowerDps(h.id, lv).toFixed(1));
    console.log(`${pad(h.name, 22)} ${dps.join('  ')}`);
  }
}

export function cumulativeIncomeThrough(level: number, diffId: DifficultyId): number {
  const diff = difficulties[diffId];
  let total = diff.startingCoins;
  for (let l = 1; l < level; l++) total += levelIncome(getEffectiveLevel(l, diff));
  return total;
}

export function upgradeAffordabilityAt(level: number, diffId: DifficultyId): {
  coins: number;
  canUpgradeToL3: boolean;
  canUpgradeToL5: boolean;
  canMergeHybrid: boolean;
} {
  const coins = cumulativeIncomeThrough(level, diffId);
  const archerL3 = towers.find((t) => t.id === 'moon-archer')!.cost + totalUpgradeCost('moon-archer', 3);
  const archerL5 = towers.find((t) => t.id === 'moon-archer')!.cost + totalUpgradeCost('moon-archer', 5);
  const mergeCost = 85 + (42 + 54) * 2 + totalUpgradeCost('moon-archer', 3) + totalUpgradeCost('thorn-spire', 3);
  return {
    coins,
    canUpgradeToL3: coins >= archerL3,
    canUpgradeToL5: coins >= archerL5,
    canMergeHybrid: coins >= mergeCost,
  };
}
