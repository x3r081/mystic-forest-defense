/**
 * Dev audit logging for game state, selection, merge candidates, and Start Level.
 */

import { getMergeCandidates } from '../data/mergeUtils';
import { getTowerDef } from '../data/towerRegistry';
import { canEditTowers, useGameStore, type GameState } from './store';

export function canStartLevel(state: Pick<GameState, 'screen' | 'phase'>): boolean {
  return state.screen === 'playing' && state.phase === 'preparing';
}

export function describeStartLevel(state: Pick<GameState, 'screen' | 'phase'>): string {
  if (state.screen !== 'playing') {
    return `Start Level unavailable: screen is "${state.screen}" (need "playing")`;
  }
  if (state.phase !== 'preparing') {
    return `Start Level unavailable: phase is "${state.phase}" (need "preparing")`;
  }
  return 'Start Level available';
}

export function auditGameState(state: GameState): void {
  const placed =
    state.selectedPlacedId != null
      ? state.placedTowers.find((t) => t.id === state.selectedPlacedId)
      : undefined;

  const mergeCandidates = placed ? getMergeCandidates(placed, state.placedTowers) : [];

  const shopDef = state.selectedTower ? getTowerDef(state.selectedTower) : null;

  console.groupCollapsed('[game audit]');
  console.log('screen:', state.screen);
  console.log('phase:', state.phase);
  console.log('paused:', state.paused);
  console.log('can edit towers:', canEditTowers(state));
  console.log('selected shop tower:', state.selectedTower ?? '(none)', shopDef?.name ?? '');
  console.log('selected placed id:', state.selectedPlacedId ?? '(none)');
  if (placed) {
    console.log('placed tower:', {
      id: placed.id,
      type: placed.towerId,
      level: placed.level,
      investedCoins: placed.investedCoins,
    });
  }
  console.log(
    'merge candidates:',
    mergeCandidates.map((c) => ({
      id: c.id,
      type: c.towerId,
      level: c.level,
    })),
  );
  console.log(describeStartLevel(state));
  console.groupEnd();
}

export function attachGameDebugAudit(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = (state: GameState) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => auditGameState(state), 120);
  };

  const unsub = useGameStore.subscribe(schedule);
  auditGameState(useGameStore.getState());

  return () => {
    if (timer) clearTimeout(timer);
    unsub();
  };
}
