import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, isSimRunning, simDelta } from './store';
import { enemyRegistry, simClock } from './registry';
import { updateCombat, getActiveProjectileCount } from './combatLoop';
import { updatePerformance } from './performance';
import { getActiveParticleCount } from './effects';

/**
 * Central simulation tick: advances the sim clock, runs combat (towers +
 * projectiles), and updates performance diagnostics.
 */
export function CombatSim() {
  const fpsSmoothed = useRef(60);
  const frameTimes = useRef(0);

  useFrame((_, delta) => {
    const gs = useGameStore.getState();
    if (isSimRunning(gs)) {
      simClock.now += simDelta(delta, gs);
      updateCombat(delta, gs);
    }

    const fps = 1 / Math.max(delta, 0.0001);
    fpsSmoothed.current += (fps - fpsSmoothed.current) * 0.08;

    frameTimes.current++;
    if (frameTimes.current >= 15) {
      frameTimes.current = 0;
      let enemies = 0;
      for (const e of enemyRegistry.values()) {
        if (e.alive) enemies++;
      }
      updatePerformance(fpsSmoothed.current, {
        enemies,
        towers: gs.placedTowers.length,
        projectiles: getActiveProjectileCount(),
        particles: getActiveParticleCount(),
      });
    }
  });

  return null;
}
