/**
 * Small, shared animation helpers used across the 3D scene.
 *
 * These easing curves and the random-phase helper were previously redefined in
 * several components; centralizing them keeps the motion consistent and the
 * call sites tidy.
 */

/** Decelerating curve, fast then settling. Good for camera dollies. */
export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

/** Gentle decelerating curve. Good for short particle/flash fades. */
export function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

/** Overshooting ease (springs slightly past 1) for dramatic pop-in scaling. */
export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** A random starting phase in [0, 2π), so looping animations don't sync up. */
export function randomPhase(): number {
  return Math.random() * Math.PI * 2;
}
