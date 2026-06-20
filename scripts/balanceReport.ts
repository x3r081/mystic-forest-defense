/**
 * Full balance audit report for the 500-level campaign.
 * Run: npx tsx scripts/balanceReport.ts
 */
import {
  DIFFICULTY_IDS,
  LEVELS_PER_MAP,
  MAP_COUNT,
  TOTAL_LEVELS,
  collectWarnings,
  difficulties,
  fmt,
  pad,
  printTowerDpsTable,
  reportSampleLevels,
  sampleLevel,
  upgradeAffordabilityAt,
  estimateTowerDps,
  levelIncome,
} from './balanceMetrics';
import { getEffectiveLevel } from '../src/data/levelUtils';
import { getLevelInMap } from '../src/data/maps';
import { getMapTransitionBonus } from '../src/data/campaignConfig';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  MYSTIC FOREST DEFENSE — 500-LEVEL BALANCE AUDIT');
console.log(`  ${MAP_COUNT} maps × ${LEVELS_PER_MAP} levels = ${TOTAL_LEVELS} total`);
console.log('═══════════════════════════════════════════════════════════════');

printTowerDpsTable();

const sampleLevels = reportSampleLevels();

for (const diffId of DIFFICULTY_IDS) {
  const diff = difficulties[diffId];
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  ${diff.label.toUpperCase()} — start ${diff.startingCoins} coins, ${diff.startingLives} lives`);
  console.log(`║  HP×${diff.enemyHealthMul} Spd×${diff.enemySpeedMul} Count×${diff.enemyCountMul} Coin×${diff.coinRewardMul} BossHP×${diff.bossHealthMul}`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  console.log('\n── Scaling samples (enemy HP / count / coin per kill) ──');
  console.log(
    `${pad('Lv', 5)} ${pad('InMap', 6)} ${pad('HP', 7)} ${pad('Count', 6)} ${pad('Coin', 6)} ${pad('Income', 8)} ${pad('WaveHP', 9)} ${pad('ReqDPS', 7)} Notes`,
  );
  for (const lv of sampleLevels) {
    const s = sampleLevel(lv, diff);
    const notes: string[] = [];
    if (s.bossHp) notes.push(`BOSS ${fmt(s.bossHp)}`);
    if (s.miniBossHp) notes.push(`MINI ${fmt(s.miniBossHp)}`);
    if (getLevelInMap(lv) === 1 && lv > 1) notes.push('+transition');
    console.log(
      `${pad(String(s.level), 5)} ${pad(String(s.levelInMap), 6)} ${pad(fmt(s.enemyHealth), 7)} ${pad(String(s.enemyCount), 6)} ${pad(String(s.coinReward), 6)} ${pad(fmt(s.income), 8)} ${pad(fmt(s.waveHp), 9)} ${pad(fmt(s.reqDps, 1), 7)} ${notes.join(' ')}`,
    );
  }

  console.log('\n── Map boss HP (levels 50, 100, …, 500) ──');
  for (let map = 1; map <= MAP_COUNT; map++) {
    const lv = map * LEVELS_PER_MAP;
    const def = getEffectiveLevel(lv, diff);
    console.log(`  Level ${pad(String(lv), 3)}: ${def.boss?.name ?? '?'} — ${fmt(def.boss?.health ?? 0)} HP, ${fmt(def.boss?.coinReward ?? 0)} coins`);
  }

  console.log('\n── Mini-boss HP (every 10 within act, excl. map finale) ──');
  for (const actStart of [1, 51, 151, 301]) {
    if (actStart > TOTAL_LEVELS) break;
    const miniLine = [10, 20, 30, 40]
      .map((offset) => {
        const lv = actStart + offset - 1;
        if (lv > TOTAL_LEVELS) return null;
        const def = getEffectiveLevel(lv, diff);
        return `L${lv}:${fmt(def.miniBoss?.health ?? 0)}`;
      })
      .filter(Boolean)
      .join('  ');
    console.log(`  Act from ${actStart}: ${miniLine}`);
  }

  console.log('\n── Upgrade affordability gates (cumulative income, no spending model) ──');
  for (const gate of [12, 15, 18, 20, 35, 45, 50, 70, 100]) {
    for (const map of [0, 1, 3, 5, 9]) {
      const lv = map * LEVELS_PER_MAP + gate;
      if (lv > TOTAL_LEVELS) continue;
      const aff = upgradeAffordabilityAt(lv, diffId);
      const flags = [
        aff.canUpgradeToL3 ? 'L3✓' : 'L3✗',
        aff.canUpgradeToL5 ? 'L5✓' : 'L5✗',
        aff.canMergeHybrid ? 'Merge✓' : 'Merge✗',
      ].join(' ');
      console.log(`  Level ${pad(String(lv), 3)} (map ${map + 1} +${gate}): ~${fmt(aff.coins)} coins  ${flags}`);
    }
  }

  const incomeTotal = Array.from({ length: TOTAL_LEVELS }, (_, i) =>
    levelIncome(getEffectiveLevel(i + 1, diff)),
  ).reduce((a, b) => a + b, 0);
  console.log(`\n  Total kill income (all ${TOTAL_LEVELS} levels): ${fmt(incomeTotal)} + ${diff.startingCoins} start`);
  console.log(`  Map transition bonuses (×${MAP_COUNT - 1}): ~${fmt(getMapTransitionBonus(diff, 51) * (MAP_COUNT - 1))} avg`);

  const warnings = collectWarnings(diffId);
  const shown = warnings.slice(0, 12);
  console.log(`\n── Warnings (${warnings.length} total, showing ${shown.length}) ──`);
  if (!shown.length) {
    console.log('  None — scaling looks healthy.');
  } else {
    for (const w of shown) console.log(`  [${w.kind}] ${w.message}`);
    if (warnings.length > shown.length) {
      console.log(`  … and ${warnings.length - shown.length} more`);
    }
  }
}

console.log('\n── Reference: competent 6-tower mix DPS ──');
const mixDps =
  estimateTowerDps('moon-archer', 5) * 2 +
  estimateTowerDps('thorn-spire', 4) +
  estimateTowerDps('crystal-cannon', 4) +
  estimateTowerDps('firefly-shrine', 3) +
  estimateTowerDps('lunar-ballista', 3);
console.log(`  End-of-act mix (2× Archer V, Thorn IV, Cannon IV, Firefly III, Lunar Ballista III): ~${fmt(mixDps, 1)} DPS`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Run `npx tsx scripts/balanceSim.ts` for full combat simulation.');
console.log('═══════════════════════════════════════════════════════════════\n');
