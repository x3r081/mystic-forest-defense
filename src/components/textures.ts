import * as THREE from 'three';

/**
 * Procedural canvas textures used for the soft, glowing look of the grove.
 * Generated once and cached so particles/sprites share GPU memory.
 */

let glowTex: THREE.Texture | null = null;

/** A soft radial dot: bright core fading to transparent edges. */
export function getGlowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

let fogTex: THREE.Texture | null = null;

/** A wispy soft blob used for drifting fog sprites. */
export function getFogTexture(): THREE.Texture {
  if (fogTex) return fogTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  fogTex = new THREE.CanvasTexture(c);
  return fogTex;
}

const gradientCache = new Map<string, THREE.Texture>();

/**
 * A vertical sky gradient: deep `top` color easing into `bottom`, with a soft
 * `accent`-tinted glow band near the horizon. Cached per color combo.
 */
export function getSkyGradient(top: string, bottom: string, accent: string): THREE.Texture {
  const key = `${top}|${bottom}|${accent}`;
  const cached = gradientCache.get(key);
  if (cached) return cached;

  const w = 4;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.55, bottom);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Horizon glow band.
  const band = ctx.createLinearGradient(0, h * 0.55, 0, h);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(1, accent);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  gradientCache.set(key, tex);
  return tex;
}
