-- Mystic Forest Defense — global leaderboard
-- Run in Supabase SQL Editor or via supabase db push

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  score integer not null,
  difficulty text not null,
  highest_level_reached integer not null,
  victory boolean not null default false,
  enemies_killed integer not null default 0,
  bosses_defeated integer not null default 0,
  merged_towers_created integer not null default 0,
  max_level_towers_created integer not null default 0,
  created_at timestamptz not null default now(),

  constraint leaderboard_player_name_len
    check (char_length(trim(player_name)) between 1 and 16),
  constraint leaderboard_score_positive
    check (score > 0),
  constraint leaderboard_difficulty_valid
    check (difficulty in ('easy', 'medium', 'hard')),
  constraint leaderboard_level_range
    check (highest_level_reached between 1 and 500),
  constraint leaderboard_enemies_nonneg
    check (enemies_killed >= 0),
  constraint leaderboard_bosses_nonneg
    check (bosses_defeated >= 0),
  constraint leaderboard_merges_nonneg
    check (merged_towers_created >= 0),
  constraint leaderboard_max_towers_nonneg
    check (max_level_towers_created >= 0)
);

create index if not exists leaderboard_score_desc_idx
  on public.leaderboard (score desc, created_at desc);

create index if not exists leaderboard_difficulty_score_idx
  on public.leaderboard (difficulty, score desc);

alter table public.leaderboard enable row level security;

-- Public read for global leaderboard
create policy "leaderboard_public_select"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

-- Insert only rows that pass the same shape checks (client-side validation is not security)
create policy "leaderboard_anon_insert"
  on public.leaderboard
  for insert
  to anon, authenticated
  with check (
    char_length(trim(player_name)) between 1 and 16
    and score > 0
    and difficulty in ('easy', 'medium', 'hard')
    and highest_level_reached between 1 and 500
    and enemies_killed >= 0
    and bosses_defeated >= 0
    and merged_towers_created >= 0
    and max_level_towers_created >= 0
  );

-- No client updates or deletes
create policy "leaderboard_no_update"
  on public.leaderboard
  for update
  to anon, authenticated
  using (false);

create policy "leaderboard_no_delete"
  on public.leaderboard
  for delete
  to anon, authenticated
  using (false);
