/**
 * Economy snapshot for balance tuning.
 * Run: npx tsx scripts/balanceReport.ts
 */
import { difficulties, type DifficultyId } from '../src/data/difficulties';
import { getEffectiveLevel } from '../src/data/levelUtils';
import { TOTAL_LEVELS } from '../src/data/levels';

function levelCoinIncome(round: number, diffId: DifficultyId): number {
  const diff = difficulties[diffId];
  const def = getEffectiveLevel(round, diff);
  let total = def.enemyCount * def.coinReward;
  if (def.boss) total += def.boss.coinReward;
  return total;
}

const REBUILD_COST = 42 * 2 + 54 + 82;
const STRONG_REBUILD = 42 * 3 + 54 + 100 + 82;

console.log('Basic rebuild (2× Archer + Thorn + Firefly):', REBUILD_COST);
console.log('Strong rebuild (3× Archer + Thorn + Cannon + Firefly):', STRONG_REBUILD, '\n');

for (const id of ['easy', 'medium', 'hard'] as DifficultyId[]) {
  const diff = difficulties[id];
  const incomes: number[] = [];

  console.log(`=== ${diff.label.toUpperCase()} ===`);
  console.log(`Start: ${diff.startingCoins} coins, ${diff.startingLives} lives`);
  console.log(`Multipliers: HP×${diff.enemyHealthMul} Spd×${diff.enemySpeedMul} Count×${diff.enemyCountMul} Coin×${diff.coinRewardMul} BossHP×${diff.bossHealthMul}`);

  for (let r = 1; r <= TOTAL_LEVELS; r++) {
    incomes.push(levelCoinIncome(r, id));
  }

  const income10 = incomes.slice(0, 10).reduce((a, b) => a + b, 0);
  const spent10 = incomes.slice(0, 10).reduce((a, b) => a + Math.round(b * 0.55), 0);
  const bankAfter10 = diff.startingCoins + income10;
  const unspentGuess = bankAfter10 - spent10;
  const atRuins = unspentGuess + diff.mapTransitionBonus;

  console.log(`  Round 11 entry: ~${atRuins} coins (est. bank ${unspentGuess} + ${diff.mapTransitionBonus} bonus)`);
  console.log(`  Basic rebuild? ${atRuins >= REBUILD_COST ? 'YES' : 'NO'} | Strong rebuild? ${atRuins >= STRONG_REBUILD ? 'YES' : 'NO'}`);
  console.log(`  Round 10 boss HP: ${getEffectiveLevel(10, diff).boss?.health}`);
  console.log(`  Round 11 foes: ${getEffectiveLevel(11, diff).enemyCount} × ${getEffectiveLevel(11, diff).enemyHealth} HP, ${getEffectiveLevel(11, diff).coinReward} coins each`);
  console.log(`  Round 20 boss HP: ${getEffectiveLevel(20, diff).boss?.health}`);
  console.log(`  Total kill income: ${incomes.reduce((a, b) => a + b, 0)}\n`);
}
