import type { DifficultyDef } from './difficulties';
import type { LevelDef } from './levels';
import { getLevelConfig as generateWithDiff } from './levelGenerator';

/** Apply difficulty multipliers to a base level definition. */
export function applyDifficultyToLevel(level: LevelDef, diff: DifficultyDef): LevelDef {
  return {
    ...level,
    enemyCount: Math.max(1, Math.round(level.enemyCount * diff.enemyCountMul)),
    enemyHealth: Math.max(1, Math.round(level.enemyHealth * diff.enemyHealthMul)),
    enemySpeed: level.enemySpeed * diff.enemySpeedMul,
    coinReward: Math.max(1, Math.round(level.coinReward * diff.coinRewardMul)),
    boss: level.boss
      ? {
          ...level.boss,
          health: Math.round(level.boss.health * diff.bossHealthMul),
          speed: level.boss.speed * diff.enemySpeedMul,
          coinReward: Math.max(1, Math.round(level.boss.coinReward * diff.coinRewardMul)),
        }
      : undefined,
  };
}

/** Level data with difficulty applied — preferred entry point. */
export function getEffectiveLevel(level: number, diff: DifficultyDef): LevelDef {
  return generateWithDiff(level, diff);
}

export { getLevelConfig, getBossConfig, generateLevelConfig } from './levelGenerator';
