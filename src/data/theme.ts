/**
 * Central visual theme for Mystic Forest Defense.
 * Shared between the 3D scene and the 2D UI so colors stay consistent.
 */
export const theme = {
  colors: {
    // Deep twilight forest palette
    night: '#0a0f1a',
    deepForest: '#0d2018',
    forest: '#163a2b',
    moss: '#3fae6b',
    glow: '#7ef9c4',
    mist: '#9fd9ff',
    arcane: '#a78bfa',
    arcaneDeep: '#5b3fae',
    ember: '#ffd27a',
    text: '#e8fff4',
    textMuted: '#9fc4b4',
  },
  fonts: {
    title: "'Cinzel', Georgia, 'Times New Roman', serif",
    display: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
} as const;

export type Theme = typeof theme;
