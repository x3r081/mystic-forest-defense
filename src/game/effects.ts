/**
 * Lightweight transient-feedback event bus with global particle budget.
 */

import { getQualityBudgets } from './performance';

export type FloatingVariant = 'damage' | 'splash' | 'coin' | 'life';

export interface FloatingText {
  id: number;
  position: [number, number, number];
  text: string;
  variant: FloatingVariant;
}

export interface Burst {
  id: number;
  position: [number, number, number];
  color: string;
}

/** A base-hit shockwave (enemy reached the portal). `power` 0..1 scales it. */
export interface BaseHit {
  id: number;
  position: [number, number, number];
  power: number;
}

type FloatingHandler = (f: FloatingText) => void;
type BurstHandler = (b: Burst) => void;
type BaseHitHandler = (b: BaseHit) => void;
type ClearHandler = () => void;

const floatingHandlers = new Set<FloatingHandler>();
const burstHandlers = new Set<BurstHandler>();
const baseHitHandlers = new Set<BaseHitHandler>();
const clearHandlers = new Set<ClearHandler>();
let nextId = 1;

let activeFloating = 0;
let activeBursts = 0;
let activeBaseHits = 0;

export function getActiveParticleCount(): number {
  return activeFloating + activeBursts + activeBaseHits;
}

export function notifyParticleRemoved(kind: 'float' | 'burst' | 'base'): void {
  if (kind === 'float') activeFloating = Math.max(0, activeFloating - 1);
  else if (kind === 'burst') activeBursts = Math.max(0, activeBursts - 1);
  else activeBaseHits = Math.max(0, activeBaseHits - 1);
}

export function subscribeClear(h: ClearHandler): () => void {
  clearHandlers.add(h);
  return () => clearHandlers.delete(h);
}

/** Drop all active VFX (map transitions, level resets). */
export function clearAllEffects(): void {
  activeFloating = 0;
  activeBursts = 0;
  activeBaseHits = 0;
  clearHandlers.forEach((h) => h());
}

export function subscribeFloating(h: FloatingHandler): () => void {
  floatingHandlers.add(h);
  return () => {
    floatingHandlers.delete(h);
  };
}

export function subscribeBurst(h: BurstHandler): () => void {
  burstHandlers.add(h);
  return () => {
    burstHandlers.delete(h);
  };
}

export function subscribeBaseHit(h: BaseHitHandler): () => void {
  baseHitHandlers.add(h);
  return () => {
    baseHitHandlers.delete(h);
  };
}

/** Publish a piece of rising text at a world position. */
export function spawnFloatingText(
  position: [number, number, number],
  text: string,
  variant: FloatingVariant,
): void {
  if (floatingHandlers.size === 0) return;
  const max = getQualityBudgets().maxFloating;
  if (activeFloating >= max) return;
  activeFloating++;
  const f: FloatingText = { id: nextId++, position, text, variant };
  floatingHandlers.forEach((h) => h(f));
}

/** Publish a particle burst (used for enemy deaths) at a world position. */
export function spawnBurst(position: [number, number, number], color: string): void {
  if (burstHandlers.size === 0) return;
  const max = getQualityBudgets().maxBursts;
  if (activeBursts >= max) return;
  activeBursts++;
  const b: Burst = { id: nextId++, position, color };
  burstHandlers.forEach((h) => h(b));
}

/** Publish a base-hit shockwave at the portal when an enemy breaks through. */
export function spawnBaseHit(position: [number, number, number], power: number): void {
  if (baseHitHandlers.size === 0) return;
  const max = getQualityBudgets().maxBaseHits;
  if (activeBaseHits >= max) return;
  activeBaseHits++;
  const b: BaseHit = { id: nextId++, position, power: Math.max(0.2, Math.min(1, power)) };
  baseHitHandlers.forEach((h) => h(b));
}
