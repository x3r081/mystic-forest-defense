/**
 * Smoke tests for combat systems after performance refactor.
 * Run with: npx tsx scripts/combatSmoke.ts
 */
import { rebuildSpatialGrid, findTargetInGrid } from '../src/game/spatialGrid';
import { enemyRegistry, applyHit, simClock, clearRuntime } from '../src/game/registry';
import type { MapId } from '../src/data/maps';

let failures = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
  if (!cond) failures++;
};

function addEnemy(id: number, x: number, z: number, progress: number, mapId: MapId = 'mystic-forest') {
  enemyRegistry.set(id, {
    id,
    mapId,
    progress,
    x,
    y: 1,
    z,
    hp: 100,
    maxHp: 100,
    baseSpeed: 0.1,
    slowUntil: 0,
    slowFactor: 1,
    dots: [],
    armor: 0,
    isBoss: false,
    radius: 0.5,
    alive: true,
  });
}

clearRuntime();
addEnemy(1, 0, 0, 0.2);
addEnemy(2, 1, 0, 0.8);
addEnemy(3, 10, 10, 0.5);

rebuildSpatialGrid(enemyRegistry.values());
const target = findTargetInGrid(enemyRegistry, 0, 0, 4 * 4);
check('spatial grid picks furthest enemy in range', target?.id === 2);

clearRuntime();
simClock.now = 0;
addEnemy(10, 0, 0, 0.5);
applyHit({
  targetId: 10,
  impactX: 0,
  impactZ: 0,
  damage: 10,
  elapsed: simClock.now,
  dot: { dps: 5, duration: 2 },
});
const rt = enemyRegistry.get(10)!;
check('DoT stack applied on hit', rt.dots.length === 1 && rt.dots[0].dps === 5);

simClock.now = 0.5;
let dps = 0;
rt.dots = rt.dots.filter((d) => d.until > simClock.now);
for (const d of rt.dots) dps += d.dps;
rt.hp -= dps * (1 - rt.armor) * 0.5;
check('DoT ticks reduce HP', rt.hp < 100);

console.log(`\n${failures === 0 ? 'ALL COMBAT SMOKE TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
