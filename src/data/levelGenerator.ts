/**
 * Procedural level generation — scaling knobs live in levelScaling.ts.
 */

import type { DifficultyDef } from './difficulties';
import { clampLevel, isActEntryLevel } from './campaignConfig';
import { isBossLevel, isFinalLevel } from './maps';
import {
  actIntensity,
  enemyKindsForLevel,
  isMiniBossLevel,
  levelNameForAct,
  levelScaling,
  miniBossStage,
} from './levelScaling';
import { getMapForLevel, getLevelInMap, getMapIndex } from './maps';
import type { BossDef, LevelDef, LevelVisual } from './levels';

function buildVisual(level: number): LevelVisual {
  const map = getMapForLevel(level);
  const levelInMap = getLevelInMap(level);
  const intensity = actIntensity(levelInMap);
  const lc = map.lightingConfig;
  const fireflyCount = Math.round(80 - intensity * 32 - getMapIndex(level) * 1.5);

  return {
    background: lc.background,
    fog: lc.fog,
    fogNear: lc.fogNear,
    fogFar: lc.fogFar,
    ambient: lc.ambient,
    accent: lc.accent,
    accentIntensity: lc.accentIntensity + intensity * 0.35,
    pathColor: lc.pathColor,
    fireflyColor: lc.fireflyColor,
    fireflyCount: Math.max(28, fireflyCount),
    intensity,
  };
}

function bossForLevel(level: number): BossDef | undefined {
  if (!isBossLevel(level)) return undefined;
  const map = getMapForLevel(level);
  const mapIndex = getMapIndex(level);
  const isFinal = isFinalLevel(level);
  const s = levelScaling;

  const baseHp = s.bossBaseHp * Math.pow(s.bossHpGrowth, mapIndex);
  const health = Math.round(isFinal ? baseHp * s.finalBossHpMul : baseHp);
  const coinReward = Math.round(s.bossCoinBase + mapIndex * s.bossCoinPerMap + (isFinal ? s.finalBossCoinBonus : 0));
  const speed = Math.max(s.bossSpeedMin, s.bossSpeedBase - mapIndex * s.bossSpeedPerMap);
  const radius = s.bossRadiusBase + mapIndex * s.bossRadiusPerMap + (isFinal ? s.finalBossRadiusBonus : 0);

  return {
    name: map.bossName,
    health,
    speed,
    coinReward,
    radius,
    color: map.bossColor ?? s.bossColorFallback,
  };
}

function miniBossForLevel(level: number, levelInMap: number): BossDef | undefined {
  if (!isMiniBossLevel(level, levelInMap)) return undefined;
  const map = getMapForLevel(level);
  const mapIndex = getMapIndex(level);
  const s = levelScaling;
  const stage = miniBossStage(levelInMap);
  const mapBossHp = s.bossBaseHp * Math.pow(s.bossHpGrowth, mapIndex);
  const hpFrac = s.miniBossHpFrac[stage] ?? s.miniBossHpFrac[s.miniBossHpFrac.length - 1];
  const mapBossCoins = s.bossCoinBase + mapIndex * s.bossCoinPerMap;
  const speed = Math.max(s.bossSpeedMin, (s.bossSpeedBase - mapIndex * s.bossSpeedPerMap) * s.miniBossSpeedMul);
  const radius = s.bossRadiusBase + mapIndex * s.bossRadiusPerMap - 0.35;

  return {
    name: `${map.name.split(' ')[0]} Warden`,
    health: Math.round(mapBossHp * hpFrac),
    speed,
    coinReward: Math.round(mapBossCoins * s.miniBossCoinFrac),
    radius: Math.max(1.2, radius),
    color: map.bossColor ?? s.bossColorFallback,
  };
}

/** Generate base level config (no difficulty applied). */
export function generateLevelConfig(level: number): LevelDef {
  const clamped = clampLevel(level);
  const map = getMapForLevel(clamped);
  const levelInMap = getLevelInMap(clamped);
  const mapIndex = getMapIndex(clamped);
  const boss = bossForLevel(clamped);
  const miniBoss = boss ? undefined : miniBossForLevel(clamped, levelInMap);
  const s = levelScaling;

  const intensity = actIntensity(levelInMap);
  const mapScale = 1 + mapIndex * s.mapHpScale;

  let enemyCount = Math.round(6 + levelInMap * 0.38 + mapIndex * 2.8);
  if (boss) {
    enemyCount = Math.round(
      s.bossMinionCountBase + mapIndex * s.bossMinionCountPerMap + levelInMap * s.bossMinionCountPerActLevel,
    );
  } else if (miniBoss) {
    enemyCount = Math.round((6 + levelInMap * 0.38 + mapIndex * 2.8) * s.miniBossMinionCountMul);
  }

  let enemyHealth = Math.round(
    s.baseEnemyHp * Math.pow(s.hpGrowthPerActLevel, levelInMap - 1) * mapScale,
  );
  const enemySpeed =
    s.baseEnemySpeed + intensity * s.speedActScale + mapIndex * s.speedMapScale;
  let coinReward = Math.max(
    4,
    Math.round(s.baseCoinReward + levelInMap * s.coinPerActLevel + mapIndex * s.coinPerMap),
  );
  let spawnRate = Math.max(
    s.minSpawnRate,
    s.baseSpawnRate - levelInMap * s.spawnRatePerActLevel - mapIndex * s.spawnRatePerMap,
  );

  if (isActEntryLevel(clamped)) {
    enemyHealth = Math.round(enemyHealth * s.actEntryHpMul);
    spawnRate = Math.min(1.15, spawnRate * s.actEntrySpawnMul);
    coinReward = Math.round(coinReward * s.actEntryCoinMul);
  }

  if (boss) {
    enemyHealth = Math.round(enemyHealth * s.bossMinionHpMul);
    spawnRate = Math.max(0.5, spawnRate * s.bossMinionSpawnMul);
  } else if (miniBoss) {
    enemyHealth = Math.round(enemyHealth * s.miniBossMinionHpMul);
    spawnRate = Math.max(0.55, spawnRate * 0.95);
  }

  const name = boss
    ? map.bossName
    : miniBoss
      ? `${miniBoss.name} · ${levelNameForAct(levelInMap)}`
      : `${map.name}: ${levelNameForAct(levelInMap)}`;

  return {
    id: clamped,
    name,
    enemyCount,
    enemyHealth,
    enemySpeed,
    coinReward,
    spawnRate,
    enemyKinds: enemyKindsForLevel(mapIndex, levelInMap),
    visual: buildVisual(clamped),
    boss,
    miniBoss,
    mapId: map.id,
    introText: levelInMap === 1 ? map.introText : undefined,
  };
}

export function getBossConfig(level: number): BossDef | undefined {
  return generateLevelConfig(level).boss;
}

/** Level config with difficulty multipliers applied. */
export function getLevelConfig(level: number, difficulty: DifficultyDef): LevelDef {
  const base = generateLevelConfig(level);
  return {
    ...base,
    enemyCount: Math.max(1, Math.round(base.enemyCount * difficulty.enemyCountMul)),
    enemyHealth: Math.max(1, Math.round(base.enemyHealth * difficulty.enemyHealthMul)),
    enemySpeed: base.enemySpeed * difficulty.enemySpeedMul,
    coinReward: Math.max(1, Math.round(base.coinReward * difficulty.coinRewardMul)),
    boss: base.boss
      ? {
          ...base.boss,
          health: Math.round(base.boss.health * difficulty.bossHealthMul),
          speed: base.boss.speed * difficulty.enemySpeedMul,
          coinReward: Math.max(1, Math.round(base.boss.coinReward * difficulty.coinRewardMul)),
        }
      : undefined,
    miniBoss: base.miniBoss
      ? {
          ...base.miniBoss,
          health: Math.round(base.miniBoss.health * difficulty.bossHealthMul),
          speed: base.miniBoss.speed * difficulty.enemySpeedMul,
          coinReward: Math.max(1, Math.round(base.miniBoss.coinReward * difficulty.coinRewardMul)),
        }
      : undefined,
  };
}
