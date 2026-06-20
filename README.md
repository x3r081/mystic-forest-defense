# Mystic Forest Defense

An arcane tower-defense game built with React, TypeScript, and React Three Fiber.
Channel the ancient grove and hold back the creeping dark across 500 levels
and ten mystic maps, culminating in a fight against the Heartwood Eternal.

![Mystic Forest Defense](src/assets/hero.png)

## Gameplay

- **500 levels across 10 maps** (50 levels per map) with procedural scaling,
  boss finales at the end of each act, and a final boss on Level 500.
- **5 tower types**, each with a distinct role — rapid moonlight arrows, splash
  cannons, snaring thorns, burning firefly motes, and a long-range oak sniper.
- **5 enemy archetypes** (goblins, brutes, wisps, armored treants, and the boss)
  with unique models, movement, armor, and resistances.
- Live combat feedback: floating damage/coin numbers, health bars, death
  particles, range previews, a boss-entrance sequence, and level transitions.

### How to play

1. Press **Play** on the title screen.
2. Read the level briefing, then **Begin the Defense**.
3. Pick a tower from the bottom shop (cards show cost, damage, range, and fire
   rate; hover for full details).
4. Click a glowing **build spot** on the battlefield to raise the tower. You can
   only build where you can afford it and off the enemy path.
5. Defeat enemies to earn coins, keep them from reaching the portal, and survive
   all 500 levels. Use **⏸**, **⟲ (restart)**, and **Menu** in the top-right at
   any time.

## Tech stack

- **React 19 + TypeScript** — UI and app structure
- **Vite 8** — dev server and bundler
- **React Three Fiber / Drei / postprocessing** — 3D rendering and effects
  (`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`)
- **Zustand** — game state management
- **CSS Modules + global CSS variables** — styling and theming

## Getting started

Requires **Node.js 20.19+** (or 22.12+) and npm.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check (tsc) and build for production into dist/
npm run preview  # serve the production build locally
npm run lint     # run ESLint
```

The production build outputs static assets to `dist/`, which can be served by
any static host (Netlify, Vercel, GitHub Pages, an S3 bucket, etc.).

## Project structure

```
src/
  components/  Reusable 3D building blocks (Tree, Crystal, Fireflies, models…)
  data/        Static config & balance data (gameConfig, levels, theme)
  game/        Game systems: Zustand store, scenes, combat loop, path, registry
  ui/          2D React/HTML overlays (HUD, shop, modals, screens, loading)
scripts/
  balanceSim.ts  Headless combat simulation used to tune game balance
```

### Architecture notes

- **State split for performance.** Coarse, render-facing state (coins, lives,
  which enemies exist) lives in the Zustand store (`game/store.ts`). Fast,
  per-frame data (enemy positions, HP, status effects) lives in a plain `Map`
  registry (`game/registry.ts`) that the `useFrame` loops mutate directly,
  avoiding React re-renders every frame.
- **Data-driven design.** Towers, enemies, and level/visual definitions live in
  `src/data`, so balance and art direction can be tuned in one place.

## Balancing tool

A headless simulation mirrors the in-game combat loop to validate balance
(difficulty curve, "no tower is useless / overpowered", winnable without perfect
play). Run it with:

```bash
npx tsx scripts/balanceSim.ts
```

## Online leaderboard (Supabase)

Scores are stored in a shared Supabase table so all players see the same global
leaderboard. Without Supabase credentials the game falls back to a **local dev
leaderboard** (this browser only) and shows a clear notice.

### 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Wait for the database to finish provisioning.

### 2. Create the leaderboard table

Open **SQL Editor** in the Supabase dashboard and run the migration file:

`supabase/migrations/001_leaderboard.sql`

This creates the `leaderboard` table, indexes, Row Level Security, and policies:

- **SELECT** — public (anon key can read all scores)
- **INSERT** — allowed only for rows that pass shape checks
- **UPDATE / DELETE** — blocked for clients

`created_at` is set automatically on insert.

### 3. Environment variables

Copy `.env.example` to `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Set:

| Variable | Where to find it |
|----------|------------------|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |

Never commit `.env.local` or hardcode keys in source.

Restart the dev server after changing env vars:

```bash
npm run dev
```

### 4. Run locally

With env vars set, **High Scores** on the main menu loads the global top 100.
After **Victory** or **Game Over**, enter a name (1–16 characters) and **Post
Score**. Each run submits at most once per client session.

Production builds pick up the same `VITE_*` variables at build time (set them in
your host’s environment, e.g. Netlify/Vercel project settings).

### Architecture

- `src/services/highScore/` — `HighScoreService` interface,
  `SupabaseHighScoreService`, `LocalHighScoreService` fallback
- Client-side validation in `validation.ts` (name length, positive score, field
  bounds) — not a security boundary; RLS enforces insert shape on the server

## License

Created as a demo project. Use freely.
