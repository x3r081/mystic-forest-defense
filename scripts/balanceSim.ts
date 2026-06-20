/**
 * Headless balance simulation for the 500-level campaign.
 *
 * Mirrors combat (spawning, targeting, projectiles, splash, slow, DoT, armor, leaks)
 * using real path geometry and data files. Simulates upgrades (normal L5, hybrid L3),
 * merges, mini-bosses, and map bosses across Easy / Medium / Hard.
 *
 * Run: npx tsx scripts/balanceSim.ts
 */
import * as THREE from 'three';
import { towers, enemyTypes, type EnemyKind, type TowerDef } from '../src/data/gameConfig';
import { TOTAL_LEVELS } from '../src/data/levels';
import { getMapForLevel, getLevelInMap, getMapIndex } from '../src/data/maps';
import { getEffectiveLevel } from '../src/data/levelUtils';
import { difficulties, type DifficultyId } from '../src/data/difficulties';
import { getMapTransitionBonus, isMapTransition } from '../src/data/campaignConfig';
import { getUpgradeCost, NORMAL_MAX_LEVEL, MERGE_DISTANCE } from '../src/data/towerUpgradeConfig';
import { getTowerDef } from '../src/data/towerRegistry';
import { getEffectiveTowerStats } from '../src/data/towerStats';
import { getMergeRecipe, MERGE_MIN_LEVEL } from '../src/data/hybridTowers';
import { estimateTowerDps } from './balanceMetrics';

function pathCurveForLevel(level: number): THREE.CatmullRomCurve3 {
  const points = getMapForLevel(level).pathPoints;
  return new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.5,
  );
}

const pathCurve = pathCurveForLevel(1);

interface BuildSpot {
  id: string;
  x: number;
  z: number;
}

function generateBuildSpots(): BuildSpot[] {
  const offsets = [MERGE_DISTANCE, MERGE_DISTANCE + 1.9];
  const minSpacing = 2.2;
  const minPathDist = 1.9;
  const samples = pathCurve.getSpacedPoints(80);
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const chosen: { x: number; z: number }[] = [];
  const STEPS = 28;
  for (let i = 0; i <= STEPS; i++) {
    const t = 0.03 + (i / STEPS) * 0.94;
    pathCurve.getPointAt(t, p);
    pathCurve.getTangentAt(t, tan);
    const nx = -tan.z;
    const nz = tan.x;
    const nlen = Math.hypot(nx, nz) || 1;
    for (const off of offsets) {
      for (const side of [1, -1]) {
        const x = p.x + (nx / nlen) * off * side;
        const z = p.z + (nz / nlen) * off * side;
        if (Math.abs(x) > 15 || Math.abs(z) > 8.5) continue;
        let nearPath = false;
        for (const s of samples) {
          if ((s.x - x) ** 2 + (s.z - z) ** 2 < minPathDist * minPathDist) {
            nearPath = true;
            break;
          }
        }
        if (nearPath) continue;
        if (chosen.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < minSpacing * minSpacing)) continue;
        chosen.push({ x, z });
      }
    }
  }
  return chosen.map((c, i) => ({ id: `spot-${i}`, x: c.x, z: c.z }));
}

const BUILD_SPOTS = generateBuildSpots();
const COV_SAMPLES = pathCurve.getSpacedPoints(240);

function coverageFraction(x: number, z: number, range: number): number {
  const r2 = range * range;
  let n = 0;
  for (const s of COV_SAMPLES) {
    if ((s.x - x) ** 2 + (s.z - z) ** 2 <= r2) n++;
  }
  return n / COV_SAMPLES.length;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimEnemy {
  id: number;
  progress: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  slowUntil: number;
  slowFactor: number;
  dots: { dps: number; until: number }[];
  armor: number;
  bounty: number;
  isBoss: boolean;
  radius: number;
  alive: boolean;
}

interface SimProjectile {
  x: number;
  z: number;
  targetId: number;
  damage: number;
  speed: number;
  splashRadius?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number };
  life: number;
  lastX: number;
  lastZ: number;
}

interface SimTower {
  uid: number;
  towerId: string;
  x: number;
  z: number;
  level: number;
  invested: number;
  cd: number;
}

interface EnemySpec {
  kind: EnemyKind;
  maxHp: number;
  speed: number;
  bounty: number;
  armor: number;
  radius: number;
  isBoss: boolean;
}

function buildSpawnQueue(level: number, diffId: DifficultyId): EnemySpec[] {
  const def = getEffectiveLevel(level, difficulties[diffId]);
  const queue: EnemySpec[] = [];
  for (let i = 0; i < def.enemyCount; i++) {
    const kind = def.enemyKinds[i % def.enemyKinds.length];
    const t = enemyTypes[kind];
    queue.push({
      kind,
      maxHp: Math.round(def.enemyHealth * t.hpMul),
      speed: def.enemySpeed * t.speedMul,
      bounty: Math.max(1, Math.round(def.coinReward * t.bountyMul)),
      armor: t.armor,
      radius: t.radius,
      isBoss: false,
    });
  }
  const insertBoss = (boss: NonNullable<typeof def.boss>, at: number) => {
    queue.splice(at, 0, {
      kind: 'corruptor',
      maxHp: boss.health,
      speed: boss.speed,
      bounty: boss.coinReward,
      armor: enemyTypes.corruptor.armor,
      radius: boss.radius,
      isBoss: true,
    });
  };
  if (def.boss) insertBoss(def.boss, Math.floor(queue.length / 3));
  else if (def.miniBoss) insertBoss(def.miniBoss, Math.floor(queue.length / 2));
  return queue;
}

const DT = 1 / 30;

function towerCombatStats(t: SimTower) {
  const def = getTowerDef(t.towerId)!;
  return getEffectiveTowerStats(def, t.level);
}

function simulateLevel(level: number, placed: SimTower[], diffId: DifficultyId, rng: () => number) {
  const queue = buildSpawnQueue(level, diffId);
  const def = getEffectiveLevel(level, difficulties[diffId]);
  const spawnRate = def.spawnRate;
  const curve = pathCurveForLevel(level);

  const enemies: SimEnemy[] = [];
  const projectiles: SimProjectile[] = [];
  let spawnIndex = 0;
  let spawnTimer = spawnRate;
  let nextId = 1;
  let elapsed = 0;
  let leaked = 0;
  let killed = 0;
  let coinsEarned = 0;

  for (const t of placed) t.cd = rng() * towerCombatStats(t).cooldown;

  const tmp = new THREE.Vector3();
  const setPos = (e: SimEnemy) => {
    curve.getPointAt(Math.min(e.progress, 1), tmp);
    e.x = tmp.x;
    e.z = tmp.z;
  };

  const findTarget = (x: number, z: number, range: number): SimEnemy | null => {
    let best: SimEnemy | null = null;
    let bestProgress = -1;
    const r2 = range * range;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      if (dx * dx + dz * dz <= r2 && e.progress > bestProgress) {
        best = e;
        bestProgress = e.progress;
      }
    }
    return best;
  };

  const applyHit = (proj: SimProjectile, impactX: number, impactZ: number) => {
    const target = enemies.find((e) => e.id === proj.targetId);
    if (target && target.alive) {
      target.hp -= proj.damage * (1 - target.armor);
      if (proj.slow) {
        target.slowUntil = elapsed + proj.slow.duration;
        target.slowFactor = proj.slow.factor;
      }
      if (proj.dot) target.dots.push({ dps: proj.dot.dps, until: elapsed + proj.dot.duration });
    }
    if (proj.splashRadius) {
      const r2 = proj.splashRadius * proj.splashRadius;
      for (const e of enemies) {
        if (!e.alive || e.id === proj.targetId) continue;
        const dx = e.x - impactX;
        const dz = e.z - impactZ;
        if (dx * dx + dz * dz <= r2) e.hp -= proj.damage * 0.6 * (1 - e.armor);
      }
    }
  };

  let guard = 0;
  while (guard++ < 100000) {
    if (spawnIndex < queue.length) {
      spawnTimer += DT;
      if (spawnTimer >= spawnRate) {
        spawnTimer = 0;
        const spec = queue[spawnIndex++];
        const e: SimEnemy = {
          id: nextId++,
          progress: 0,
          x: 0,
          z: 0,
          hp: spec.maxHp,
          maxHp: spec.maxHp,
          baseSpeed: spec.speed,
          slowUntil: 0,
          slowFactor: 1,
          dots: [],
          armor: spec.armor,
          bounty: spec.bounty,
          isBoss: spec.isBoss,
          radius: spec.radius,
          alive: true,
        };
        setPos(e);
        enemies.push(e);
      }
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.dots.length) {
        e.dots = e.dots.filter((d) => d.until > elapsed);
        let dps = 0;
        for (const d of e.dots) dps += d.dps;
        if (dps) e.hp -= dps * (1 - e.armor) * DT;
      }
      if (e.hp <= 0) {
        e.alive = false;
        killed++;
        coinsEarned += e.bounty;
        continue;
      }
      const slow = e.slowUntil > elapsed ? e.slowFactor : 1;
      e.progress += e.baseSpeed * slow * DT;
      if (e.progress >= 1) {
        e.alive = false;
        leaked++;
        continue;
      }
      setPos(e);
    }

    for (const t of placed) {
      const stats = towerCombatStats(t);
      t.cd -= DT;
      if (t.cd > 0) continue;
      const target = findTarget(t.x, t.z, stats.range);
      if (!target) continue;
      t.cd = stats.cooldown;
      projectiles.push({
        x: t.x,
        z: t.z,
        targetId: target.id,
        damage: stats.damage,
        speed: stats.projectileSpeed,
        splashRadius: stats.splashRadius,
        slow: stats.slow,
        dot: stats.dot,
        life: 0,
        lastX: target.x,
        lastZ: target.z,
      });
    }

    for (const proj of projectiles) {
      proj.life += DT;
      if (proj.life > 4) {
        proj.targetId = -1;
        continue;
      }
      const target = enemies.find((e) => e.id === proj.targetId);
      if (!target || !target.alive) {
        if (proj.splashRadius) applyHit(proj, proj.lastX, proj.lastZ);
        proj.targetId = -1;
        continue;
      }
      proj.lastX = target.x;
      proj.lastZ = target.z;
      const dx = target.x - proj.x;
      const dz = target.z - proj.z;
      const dist = Math.hypot(dx, dz);
      const step = proj.speed * DT;
      if (dist <= step + 0.3) {
        applyHit(proj, target.x, target.z);
        proj.targetId = -1;
        continue;
      }
      proj.x += (dx / dist) * step;
      proj.z += (dz / dist) * step;
    }

    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].targetId === -1) projectiles.splice(i, 1);
    for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);

    elapsed += DT;
    if (spawnIndex >= queue.length && enemies.length === 0) break;
  }

  return { leaked, killed, coinsEarned, durationSec: elapsed };
}

function towerById(id: string): TowerDef {
  const t = getTowerDef(id);
  if (!t || 'isHybrid' in t) throw new Error(`no base tower ${id}`);
  return t;
}

function bestOpenSpot(usedIds: Set<string>, range: number): BuildSpot | null {
  let best: BuildSpot | null = null;
  let bestCov = -1;
  for (const s of BUILD_SPOTS) {
    if (usedIds.has(s.id)) continue;
    const cov = coverageFraction(s.x, s.z, range);
    if (cov > bestCov) {
      bestCov = cov;
      best = s;
    }
  }
  return best;
}

function targetCounts(level: number): Record<string, number> {
  const levelInMap = getLevelInMap(level);
  const mapIndex = getMapIndex(level);
  const growth = Math.floor(levelInMap / 12) + mapIndex;
  return {
    'moon-archer': Math.min(7, 3 + growth),
    'thorn-spire': Math.min(3, 1 + Math.floor(levelInMap / 18) + Math.floor(mapIndex / 2)),
    'crystal-cannon': Math.min(3, Math.floor(levelInMap / 22) + Math.floor(mapIndex / 2)),
    'firefly-shrine': Math.min(2, Math.floor(levelInMap / 28) + Math.floor(mapIndex / 3)),
    'oak-guardian': Math.min(2, Math.floor(levelInMap / 35) + Math.floor(mapIndex / 4)),
  };
}

function targetTowerLevel(level: number, towerId: string): number {
  const levelInMap = getLevelInMap(level);
  const def = getTowerDef(towerId);
  const isHybrid = def != null && 'isHybrid' in def && def.isHybrid;
  const max = isHybrid ? 3 : NORMAL_MAX_LEVEL;
  if (levelInMap >= 45) return max;
  if (levelInMap >= 30) return Math.min(max, isHybrid ? 3 : 4);
  if (levelInMap >= 18) return Math.min(max, isHybrid ? 2 : 3);
  if (levelInMap >= 8) return 2;
  return 1;
}

let nextTowerUid = 1;

function tryBuyTowardPlan(
  coins: number,
  placed: SimTower[],
  usedSpots: Set<string>,
  counts: Record<string, number>,
  level: number,
): { coins: number; spent: number } {
  let spent = 0;
  const plan = targetCounts(level);
  let progress = true;
  while (progress) {
    progress = false;
    const wishlist = Object.keys(plan)
      .filter((id) => (counts[id] ?? 0) < (plan[id] ?? 0))
      .map(towerById)
      .sort((a, b) => a.cost - b.cost);
    for (const def of wishlist) {
      if (coins < def.cost) continue;
      const spot = bestOpenSpot(usedSpots, def.range);
      if (!spot) continue;
      usedSpots.add(spot.id);
      placed.push({
        uid: nextTowerUid++,
        towerId: def.id,
        x: spot.x,
        z: spot.z,
        level: 1,
        invested: def.cost,
        cd: 0,
      });
      counts[def.id] = (counts[def.id] ?? 0) + 1;
      coins -= def.cost;
      spent += def.cost;
      progress = true;
      break;
    }
  }
  return { coins, spent };
}

function tryUpgrades(level: number, coins: number, placed: SimTower[]): { coins: number; spent: number } {
  let spent = 0;
  let progress = true;
  while (progress) {
    progress = false;
    const candidates = placed
      .map((t) => ({
        t,
        target: targetTowerLevel(level, t.towerId),
        cost: getUpgradeCost(t.towerId, t.level),
      }))
      .filter((c) => c.t.level < c.target && Number.isFinite(c.cost) && coins >= c.cost)
      .sort((a, b) => a.cost - b.cost);
    for (const c of candidates) {
      coins -= c.cost;
      spent += c.cost;
      c.t.level++;
      c.t.invested += c.cost;
      progress = true;
      break;
    }
  }
  return { coins, spent };
}

function tryMerge(level: number, coins: number, placed: SimTower[], counts: Record<string, number>): { coins: number; spent: number } {
  const levelInMap = getLevelInMap(level);
  if (levelInMap < 25) return { coins, spent: 0 };
  let spent = 0;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.level < MERGE_MIN_LEVEL || b.level < MERGE_MIN_LEVEL) continue;
      const recipe = getMergeRecipe(a.towerId, b.towerId);
      if (!recipe) continue;
      if (coins < recipe.mergeCost) continue;
      const spot = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      coins -= recipe.mergeCost;
      spent += recipe.mergeCost;
      const invested = a.invested + b.invested + recipe.mergeCost;
      const hybrid = {
        uid: nextTowerUid++,
        towerId: recipe.hybridId,
        x: spot.x,
        z: spot.z,
        level: Math.min(a.level, b.level),
        invested,
        cd: 0,
      };
      placed.splice(j, 1);
      placed.splice(i, 1);
      placed.push(hybrid);
      counts[a.towerId] = (counts[a.towerId] ?? 1) - 1;
      counts[b.towerId] = (counts[b.towerId] ?? 1) - 1;
      counts[recipe.hybridId] = (counts[recipe.hybridId] ?? 0) + 1;
      return { coins, spent };
    }
  }
  return { coins, spent };
}

interface RunResult {
  diffId: DifficultyId;
  lives: number;
  lastLevel: number;
  won: boolean;
  totalLeaked: number;
  failReason?: string;
}

function runCampaign(diffId: DifficultyId, opts: { verbose?: boolean; seed?: number } = {}): RunResult {
  const { verbose = false, seed = 42 } = opts;
  const diff = difficulties[diffId];
  const rng = mulberry32(seed);
  let coins = diff.startingCoins;
  let lives = diff.startingLives;
  const placed: SimTower[] = [];
  const usedSpots = new Set<string>();
  const counts: Record<string, number> = {};
  let totalLeaked = 0;
  let lastLevel = 0;

  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    lastLevel = level;
    if (isMapTransition(level - 1)) {
      coins += getMapTransitionBonus(diff, level);
    }

    const buy = tryBuyTowardPlan(coins, placed, usedSpots, counts, level);
    coins = buy.coins;
    const up = tryUpgrades(level, coins, placed);
    coins = up.coins;
    const merge = tryMerge(level, coins, placed, counts);
    coins = merge.coins;

    const res = simulateLevel(level, placed, diffId, rng);
    coins += res.coinsEarned;
    lives -= res.leaked;
    totalLeaked += res.leaked;

    if (verbose && (level <= 15 || level % 10 === 0 || level === TOTAL_LEVELS)) {
      const dps = placed.reduce((s, t) => s + estimateTowerDps(t.towerId, t.level), 0);
      console.log(
        `  L${String(level).padStart(3)} ${getEffectiveLevel(level, diff).name.slice(0, 28).padEnd(28)} leak=${res.leaked} lives=${lives} coins=${coins} towers=${placed.length} dps≈${dps.toFixed(0)}`,
      );
    }

    if (lives <= 0) {
      return { diffId, lives, lastLevel: level, won: false, totalLeaked, failReason: `died at level ${level}` };
    }
  }

  return { diffId, lives, lastLevel, won: true, totalLeaked };
}

function printTowerMetrics() {
  console.log('\n=== Tower metrics (base L1) ===');
  console.log(['tower', 'cost', 'dps', 'range', 'cov%'].join('\t'));
  for (const t of towers) {
    const covs = BUILD_SPOTS.map((s) => coverageFraction(s.x, s.z, t.range)).sort((a, b) => b - a);
    const topCov = covs.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
    console.log([t.name.slice(0, 14), t.cost, (t.damage / t.cooldown).toFixed(1), t.range, (topCov * 100).toFixed(0)].join('\t'));
  }
}

function main() {
  console.log(`Build spots: ${BUILD_SPOTS.length} | Campaign: ${TOTAL_LEVELS} levels`);
  printTowerMetrics();

  console.log('\n=== Full campaign simulation (upgrades + merges) ===');
  const results: RunResult[] = [];
  for (const diffId of ['easy', 'medium', 'hard'] as DifficultyId[]) {
    console.log(`\n── ${difficulties[diffId].label} ──`);
    const r = runCampaign(diffId, { verbose: true, seed: diffId === 'hard' ? 77 : 42 });
    results.push(r);
    console.log(
      `  Result: ${r.won ? 'VICTORY' : 'DEFEAT'} at L${r.lastLevel}, lives=${r.lives}, total leaks=${r.totalLeaked}`,
    );
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    const ok = r.won ? '✓' : '✗';
    console.log(`  ${ok} ${difficulties[r.diffId].label.padEnd(8)} ${r.won ? `cleared all ${TOTAL_LEVELS}` : r.failReason}`);
  }

  const medium = results.find((r) => r.diffId === 'medium');
  if (medium && !medium.won) {
    console.log('\n⚠ Medium difficulty failed — balance may need tuning.');
    process.exitCode = 1;
  }
}

main();
