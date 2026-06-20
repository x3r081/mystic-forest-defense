import { create } from 'zustand';
import { enemyTypes, getTower, type EnemyKind } from '../data/gameConfig';
import {
  DEFAULT_DIFFICULTY,
  getDifficulty,
  type DifficultyDef,
  type DifficultyId,
} from '../data/difficulties';
import { getEffectiveLevel } from '../data/levelUtils';
import { TOTAL_LEVELS } from '../data/levels';
import { getMapTransitionBonus } from '../data/campaignConfig';
import { isMapTransition } from '../data/maps';
import { getTowerDef } from '../data/towerRegistry';
import { getHybridTower } from '../data/hybridTowers';
import { getUpgradeCost, getSellRefund } from '../data/towerStats';
import { maxLevelForTower } from '../data/towerUpgradeConfig';
import { hybridIdForMerge, mergeCostFor } from '../data/mergeUtils';
import { enemyRegistry, clearRuntime } from './registry';
import { clearCombatSim } from './combatLoop';
import { spawnBurst, spawnFloatingText, spawnBaseHit, clearAllEffects } from './effects';
import { evaluatePlacement, logPlacementFailure } from './collision';
import { getBasePoint, getSpawnPoint, syncActiveMapForLevel } from './world';

export type GameScreen =
  | 'start'
  | 'difficulty'
  | 'leaderboard'
  | 'playing'
  | 'maptransition'
  | 'levelcomplete'
  | 'victory'
  | 'gameover';

export type GamePhase = 'preparing' | 'running';
export const SPEED_OPTIONS = [0.5, 1, 2, 3] as const;

export interface EnemySpec {
  kind: EnemyKind;
  maxHp: number;
  speed: number;
  bounty: number;
  color: string;
  radius: number;
  armor: number;
  opacity: number;
  lifeDamage: number;
  isBoss: boolean;
}

export interface Enemy extends EnemySpec {
  id: number;
  hp: number;
}

export interface PlacedTower {
  id: number;
  towerId: string;
  position: [number, number, number];
  color: string;
  /** Upgrade level 1–5 (normal) or 1–3 (hybrid). */
  level: number;
  investedCoins: number;
}

export interface RunStats {
  runId: string;
  enemiesKilled: number;
  bossesDefeated: number;
  mergedTowersCreated: number;
  maxLevelTowersCreated: number;
}

function newRunStats(): RunStats {
  return {
    runId: crypto.randomUUID(),
    enemiesKilled: 0,
    bossesDefeated: 0,
    mergedTowersCreated: 0,
    maxLevelTowersCreated: 0,
  };
}

export interface GameState {
  screen: GameScreen;
  phase: GamePhase;
  paused: boolean;
  gameSpeed: number;
  selectedDifficulty: DifficultyId;
  difficultyConfig: DifficultyDef;
  mapId: import('../data/maps').MapId;
  coins: number;
  lives: number;
  level: number;
  totalEnemies: number;
  clearedCount: number;
  coinsThisLevel: number;
  spawnQueue: EnemySpec[];
  spawnIndex: number;
  spawnRate: number;
  enemies: Enemy[];
  /** Shop tower selected for placement. */
  selectedTower: string | null;
  /** Placed tower selected for details / upgrade / sell / merge. */
  selectedPlacedId: number | null;
  placedTowers: PlacedTower[];
  runStats: RunStats;

  openDifficultySelect: () => void;
  openLeaderboard: () => void;
  backToTitle: () => void;
  selectDifficulty: (id: DifficultyId) => void;
  startGame: () => void;
  goToMenu: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  startRun: () => void;
  setGameSpeed: (speed: number) => void;
  spawnNext: () => void;
  removeEnemy: (id: number, reachedBase: boolean) => void;
  nextLevel: () => void;
  continueToMap: () => void;
  selectShopTower: (towerId: string) => void;
  selectPlacedTower: (towerId: number | null) => void;
  placeTower: (position: [number, number, number]) => boolean;
  upgradePlacedTower: (towerId: number) => boolean;
  sellPlacedTower: (towerId: number) => boolean;
  mergePlacedTowers: (primaryId: number, partnerId: number) => boolean;
}

function makeMinionSpec(kind: EnemyKind, level: ReturnType<typeof getEffectiveLevel>): EnemySpec {
  const t = enemyTypes[kind];
  return {
    kind,
    maxHp: Math.round(level.enemyHealth * t.hpMul),
    speed: level.enemySpeed * t.speedMul,
    bounty: Math.max(1, Math.round(level.coinReward * t.bountyMul)),
    color: t.color,
    radius: t.radius,
    armor: t.armor,
    opacity: t.opacity,
    lifeDamage: t.lifeDamage,
    isBoss: false,
  };
}

function buildSpawnQueue(level: number, diff: DifficultyDef): EnemySpec[] {
  const def = getEffectiveLevel(level, diff);
  const queue: EnemySpec[] = [];

  for (let i = 0; i < def.enemyCount; i++) {
    queue.push(makeMinionSpec(def.enemyKinds[i % def.enemyKinds.length], def));
  }

  if (def.boss) {
    const boss = def.boss;
    const bossSpec: EnemySpec = {
      kind: 'corruptor',
      maxHp: boss.health,
      speed: boss.speed,
      bounty: boss.coinReward,
      color: boss.color,
      radius: boss.radius,
      armor: enemyTypes.corruptor.armor,
      opacity: 1,
      lifeDamage: enemyTypes.corruptor.lifeDamage,
      isBoss: true,
    };
    queue.splice(Math.floor(queue.length / 3), 0, bossSpec);
  } else if (def.miniBoss) {
    const mini = def.miniBoss;
    const miniSpec: EnemySpec = {
      kind: 'corruptor',
      maxHp: mini.health,
      speed: mini.speed,
      bounty: mini.coinReward,
      color: mini.color,
      radius: mini.radius,
      armor: enemyTypes.corruptor.armor,
      opacity: 1,
      lifeDamage: 2,
      isBoss: true,
    };
    queue.splice(Math.floor(queue.length / 2), 0, miniSpec);
  }

  return queue;
}

function levelSetup(level: number, diff: DifficultyDef) {
  const mapId = syncActiveMapForLevel(level);
  const queue = buildSpawnQueue(level, diff);
  const def = getEffectiveLevel(level, diff);
  return {
    level,
    mapId,
    totalEnemies: queue.length,
    clearedCount: 0,
    coinsThisLevel: 0,
    spawnQueue: queue,
    spawnIndex: 0,
    spawnRate: def.spawnRate,
    enemies: [] as Enemy[],
  };
}

function syncMapForLevel(level: number) {
  return syncActiveMapForLevel(level);
}

let nextEnemyId = 1;
let nextTowerId = 1;

function resetSimulation(clearEffects = true) {
  clearRuntime();
  clearCombatSim();
  if (clearEffects) clearAllEffects();
}

function freshRun(screen: GameScreen, difficulty: DifficultyId) {
  nextEnemyId = 1;
  nextTowerId = 1;
  resetSimulation();
  const diff = getDifficulty(difficulty);
  return {
    screen,
    phase: 'preparing' as GamePhase,
    paused: false,
    gameSpeed: 1,
    selectedDifficulty: difficulty,
    difficultyConfig: diff,
    coins: diff.startingCoins,
    lives: diff.startingLives,
    selectedTower: null,
    selectedPlacedId: null,
    placedTowers: [] as PlacedTower[],
    runStats: newRunStats(),
    ...levelSetup(1, diff),
  };
}

function preparingPatch(extra: Partial<GameState> = {}) {
  return {
    phase: 'preparing' as GamePhase,
    selectedPlacedId: null,
    selectedTower: null,
    ...extra,
  };
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'start',
  phase: 'preparing',
  paused: false,
  gameSpeed: 1,
  selectedDifficulty: DEFAULT_DIFFICULTY,
  difficultyConfig: getDifficulty(DEFAULT_DIFFICULTY),
  coins: getDifficulty(DEFAULT_DIFFICULTY).startingCoins,
  lives: getDifficulty(DEFAULT_DIFFICULTY).startingLives,
  selectedTower: null,
  selectedPlacedId: null,
  placedTowers: [],
  runStats: newRunStats(),
  ...levelSetup(1, getDifficulty(DEFAULT_DIFFICULTY)),

  openDifficultySelect: () => set({ screen: 'difficulty' }),
  openLeaderboard: () => set({ screen: 'leaderboard' }),
  backToTitle: () => set({ screen: 'start' }),
  selectDifficulty: (id) =>
    set({ selectedDifficulty: id, difficultyConfig: getDifficulty(id) }),

  startGame: () => set((state) => freshRun('playing', state.selectedDifficulty)),
  goToMenu: () => set(freshRun('start', useGameStore.getState().selectedDifficulty)),

  pauseRun: () =>
    set((state) =>
      state.screen === 'playing' && state.phase === 'running' && !state.paused
        ? { paused: true }
        : state,
    ),

  resumeRun: () =>
    set((state) =>
      state.screen === 'playing' && state.phase === 'running' && state.paused
        ? { paused: false }
        : state,
    ),

  startRun: () =>
    set((state) =>
      state.screen === 'playing' && state.phase === 'preparing'
        ? { phase: 'running', paused: false, selectedPlacedId: null, selectedTower: null }
        : state,
    ),

  setGameSpeed: (speed) => set({ gameSpeed: speed }),

  spawnNext: () =>
    set((state) => {
      if (state.screen !== 'playing' || state.phase !== 'running' || state.paused) return state;
      if (state.spawnIndex >= state.spawnQueue.length) return state;
      const spec = state.spawnQueue[state.spawnIndex];
      const spawn = getSpawnPoint(state.mapId);
      const enemy: Enemy = { ...spec, id: nextEnemyId++, hp: spec.maxHp };
      enemyRegistry.set(enemy.id, {
        id: enemy.id,
        mapId: state.mapId,
        progress: 0,
        x: spawn.x,
        y: spec.radius + 0.5,
        z: spawn.z,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        baseSpeed: spec.speed,
        slowUntil: 0,
        slowFactor: 1,
        dots: [],
        armor: spec.armor,
        isBoss: spec.isBoss,
        radius: spec.radius,
        alive: true,
      });
      return {
        enemies: [...state.enemies, enemy],
        spawnIndex: state.spawnIndex + 1,
      };
    }),

  removeEnemy: (id, reachedBase) =>
    set((state) => {
      const enemy = state.enemies.find((e) => e.id === id);
      if (!enemy) return state;

      const rt = enemyRegistry.get(id);
      const pos: [number, number, number] = rt
        ? [rt.x, rt.y, rt.z]
        : [0, enemy.radius + 0.5, 0];

      enemyRegistry.delete(id);
      const enemies = state.enemies.filter((e) => e.id !== id);
      const clearedCount = state.clearedCount + 1;

      let { coins, lives, coinsThisLevel } = state;
      const base = getBasePoint(state.mapId);
      if (reachedBase) {
        const drained = enemy.isBoss ? lives : Math.min(lives, enemy.lifeDamage);
        lives = Math.max(0, lives - drained);
        spawnFloatingText(
          [base.x, 1.6, base.z],
          `\u2212${drained} ${drained === 1 ? 'life' : 'lives'}`,
          'life',
        );
        spawnBaseHit([base.x, 0, base.z], enemy.isBoss ? 1 : drained / 3);
      } else {
        coins += enemy.bounty;
        coinsThisLevel += enemy.bounty;
        spawnBurst(pos, enemy.color);
        spawnFloatingText([pos[0], pos[1] + 0.5, pos[2]], `+${enemy.bounty}`, 'coin');
      }

      let screen: GameScreen = state.screen;
      const runPatch: Partial<GameState> = {};
      if (!reachedBase) {
        runPatch.runStats = {
          ...state.runStats,
          enemiesKilled: state.runStats.enemiesKilled + 1,
          bossesDefeated: state.runStats.bossesDefeated + (enemy.isBoss ? 1 : 0),
        };
      }
      if (reachedBase && lives <= 0) {
        screen = 'gameover';
      } else if (clearedCount >= state.totalEnemies) {
        screen = state.level >= TOTAL_LEVELS ? 'victory' : 'levelcomplete';
      }

      const speedPatch = screen !== 'playing' ? { gameSpeed: 1 } : {};
      return { enemies, clearedCount, coins, lives, coinsThisLevel, screen, ...runPatch, ...speedPatch };
    }),

  nextLevel: () =>
    set((state) => {
      resetSimulation();
      const next = Math.min(state.level + 1, TOTAL_LEVELS);
      const mapChanged = isMapTransition(state.level);

      if (mapChanged) {
        syncMapForLevel(next);
        return {
          screen: 'maptransition' as GameScreen,
          paused: false,
          gameSpeed: 1,
          placedTowers: [],
          coins: state.coins + getMapTransitionBonus(state.difficultyConfig, next),
          lives: state.lives,
          ...preparingPatch(),
          ...levelSetup(next, state.difficultyConfig),
        };
      }

      return {
        screen: 'playing' as GameScreen,
        paused: false,
        gameSpeed: 1,
        ...preparingPatch(),
        ...levelSetup(next, state.difficultyConfig),
      };
    }),

  continueToMap: () =>
    set((state) => {
      syncMapForLevel(state.level);
      resetSimulation();
      return {
        screen: 'playing',
        enemies: [] as Enemy[],
        placedTowers: [],
        ...preparingPatch(),
      };
    }),

  selectShopTower: (towerId) =>
    set((state) => ({
      selectedTower: state.selectedTower === towerId ? null : towerId,
      selectedPlacedId: null,
    })),

  selectPlacedTower: (towerId) =>
    set({ selectedPlacedId: towerId, selectedTower: null }),

  placeTower: (position) => {
    const state = useGameStore.getState();
    if (!canEditTowers(state)) return false;

    const result = evaluatePlacement(position[0], position[2], {
      screen: state.screen,
      selectedTower: state.selectedTower,
      mapId: state.mapId,
      coins: state.coins,
      placedTowers: state.placedTowers,
    });

    if (!result.ok) {
      logPlacementFailure(result.reason);
      return false;
    }

    const def = getTower(state.selectedTower);
    if (!def) {
      logPlacementFailure('no tower selected');
      return false;
    }

    set({
      coins: state.coins - def.cost,
      placedTowers: [
        ...state.placedTowers,
        {
          id: nextTowerId++,
          towerId: def.id,
          position,
          color: def.color,
          level: 1,
          investedCoins: def.cost,
        },
      ],
      selectedTower: null,
    });
    return true;
  },

  upgradePlacedTower: (towerId) => {
    const state = useGameStore.getState();
    if (!canEditTowers(state)) return false;
    const tower = state.placedTowers.find((t) => t.id === towerId);
    if (!tower) return false;
    const def = getTowerDef(tower.towerId);
    if (!def) return false;
    const cost = getUpgradeCost(tower.towerId, tower.level);
    if (cost === Infinity || state.coins < cost) return false;
    const newLevel = tower.level + 1;
    const hitMax = newLevel === maxLevelForTower(tower.towerId) && tower.level < newLevel;
    set({
      coins: state.coins - cost,
      placedTowers: state.placedTowers.map((t) =>
        t.id === towerId
          ? { ...t, level: newLevel, investedCoins: t.investedCoins + cost }
          : t,
      ),
      runStats: hitMax
        ? { ...state.runStats, maxLevelTowersCreated: state.runStats.maxLevelTowersCreated + 1 }
        : state.runStats,
    });
    return true;
  },

  sellPlacedTower: (towerId) => {
    const state = useGameStore.getState();
    if (!canEditTowers(state)) return false;
    const tower = state.placedTowers.find((t) => t.id === towerId);
    if (!tower) return false;
    const refund = getSellRefund(tower.investedCoins);
    set({
      coins: state.coins + refund,
      placedTowers: state.placedTowers.filter((t) => t.id !== towerId),
      selectedPlacedId: state.selectedPlacedId === towerId ? null : state.selectedPlacedId,
    });
    return true;
  },

  mergePlacedTowers: (primaryId, partnerId) => {
    const state = useGameStore.getState();
    if (!canEditTowers(state)) return false;
    const primary = state.placedTowers.find((t) => t.id === primaryId);
    const partner = state.placedTowers.find((t) => t.id === partnerId);
    if (!primary || !partner || primaryId === partnerId) return false;

    const hybridId = hybridIdForMerge(primary.towerId, partner.towerId);
    const cost = mergeCostFor(primary, partner);
    if (!hybridId || cost == null) return false;
    if (state.coins < cost) return false;

    const hybrid = getHybridTower(hybridId);
    if (!hybrid) return false;

    const invested = primary.investedCoins + partner.investedCoins + cost;
    const newId = nextTowerId++;

    set({
      coins: state.coins - cost,
      placedTowers: [
        ...state.placedTowers.filter((t) => t.id !== primaryId && t.id !== partnerId),
        {
          id: newId,
          towerId: hybridId,
          position: primary.position,
          color: hybrid.color,
          level: 1,
          investedCoins: invested,
        },
      ],
      selectedPlacedId: newId,
      selectedTower: null,
      runStats: {
        ...state.runStats,
        mergedTowersCreated: state.runStats.mergedTowersCreated + 1,
      },
    });
    return true;
  },
}));

export function canEditTowers(state: Pick<GameState, 'screen' | 'phase'>): boolean {
  if (state.screen !== 'playing') return false;
  return state.phase === 'preparing' || state.phase === 'running';
}

export function isSimRunning(state: GameState): boolean {
  return state.screen === 'playing' && state.phase === 'running' && !state.paused;
}

export function simDelta(realDelta: number, state: GameState): number {
  return Math.min(realDelta, 1 / 30) * state.gameSpeed;
}

if (import.meta.env?.DEV) {
  (window as unknown as { __game?: typeof useGameStore }).__game = useGameStore;
}
