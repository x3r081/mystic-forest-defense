import { useEffect, useState } from 'react';
import { perfStats, getQuality, type QualityLevel } from '../game/performance';
import { getActiveParticleCount } from '../game/effects';
import { getActiveProjectileCount } from '../game/combatLoop';
import './PerformanceOverlay.css';

/** Dev-only HUD showing live FPS and entity counts. */
export function PerformanceOverlay() {
  const [stats, setStats] = useState({ ...perfStats, particles: 0, projectiles: 0 });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = window.setInterval(() => {
      setStats({
        ...perfStats,
        particles: getActiveParticleCount(),
        projectiles: getActiveProjectileCount(),
      });
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  if (!import.meta.env.DEV) return null;

  const q = getQuality() as QualityLevel;

  return (
    <div className="perf-overlay" aria-hidden>
      <div>FPS {Math.round(stats.fps)}</div>
      <div>Quality {q}</div>
      <div>Enemies {stats.enemies}</div>
      <div>Towers {stats.towers}</div>
      <div>Projectiles {stats.projectiles}</div>
      <div>Particles {stats.particles}</div>
    </div>
  );
}
