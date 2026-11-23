-- ======================================================================
-- Laksa Arcade — Supabase schema. Run this once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste everything → Run). It is safe
-- to run again after an update.
--
-- The game never touches the tables directly: the public anon key only has
-- EXECUTE on the gebok_* functions below, which run as their owner
-- (security definer). Sign-in is by player name (the game asks for the
-- e-mail once, when the name is new), so a record is exactly as private as
-- its player name; e-mail addresses are only returned to the admin page.
-- ======================================================================

create table if not exists public.players (
  id           text primary key,
  username     text not null,
  username_key text not null unique,                 -- lower(trim(username)): player names are unique
  email        text not null,
  email_key    text not null,
  data         jsonb not null,                       -- the profile as the game stores it (stats, runs, games, achievements …)
  entry        jsonb not null default '{}'::jsonb,   -- the public leaderboard entry (no e-mail)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists players_email_key_idx on public.players (email_key);
create index if not exists players_updated_at_idx on public.players (updated_at desc);

-- Private settings: the admin key lives here (see the end of this file).
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.players enable row level security;
alter table public.app_settings enable row level security;
revoke all on table public.players from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;

-- ------------------------------------------------------------- helpers
create or replace function public.gebok_norm(p text) returns text
language sql immutable as $$ select lower(trim(coalesce(p, ''))) $$;

create or replace function public.gebok_profile(r public.players) returns jsonb
language sql immutable as $$ select r.data || jsonb_build_object('id', r.id, 'account', 'supabase') $$;

create or replace function public.gebok_is_admin(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_settings where key = 'admin_key' and value <> '' and value = coalesce(p_key, ''))
$$;

-- ------------------------------------------------------------ game API
create or replace function public.gebok_ping() returns text
language sql stable as $$ select 'ok' $$;

-- The record for a player name (case-insensitive) or, for a new name, the record that
-- already has that e-mail address. null = a new player.
create or replace function public.gebok_sign_in(p_name text, p_email text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.players%rowtype;
begin
  select * into r from public.players where username_key = public.gebok_norm(p_name) limit 1;
  if not found and public.gebok_norm(p_email) <> '' then
    select * into r from public.players where email_key = public.gebok_norm(p_email) order by updated_at desc limit 1;
  end if;
  if not found then return null; end if;
  return public.gebok_profile(r);
end $$;

-- Creates the record. A name taken meanwhile returns that record instead: two players never share a name.
create or replace function public.gebok_register(p_id text, p_name text, p_email text, p_data jsonb, p_entry jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.players%rowtype;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or public.gebok_norm(p_email) = '' then
    raise exception 'name and e-mail are required' using errcode = '22023';
  end if;
  insert into public.players (id, username, username_key, email, email_key, data, entry)
  values (p_id, trim(p_name), public.gebok_norm(p_name), trim(p_email), public.gebok_norm(p_email), coalesce(p_data, '{}'::jsonb), coalesce(p_entry, '{}'::jsonb))
  on conflict (username_key) do nothing
  returning * into r;
  if not found then
    select * into r from public.players where username_key = public.gebok_norm(p_name) limit 1;
  end if;
  return public.gebok_profile(r);
end $$;

-- Saves a profile after a game. false = the record no longer exists.
create or replace function public.gebok_save(p_id text, p_data jsonb, p_entry jsonb default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_data) > 4000000 then raise exception 'profile too large' using errcode = '22023'; end if;
  update public.players
     set data = p_data, entry = coalesce(p_entry, entry), updated_at = now()
   where id = p_id;
  return found;
end $$;

-- Top entries for one key: bestScore (3D runner), platformBest, crosswordBest, wordsearchBest.
create or replace function public.gebok_leaderboard(p_key text default 'bestScore', p_limit integer default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k text := case when p_key in ('bestScore', 'platformBest', 'crosswordBest', 'wordsearchBest') then p_key else 'bestScore' end;
  n integer := greatest(1, least(coalesce(p_limit, 100), 500));
begin
  return coalesce((
    select jsonb_agg(e) from (
      select entry || jsonb_build_object('id', id) as e
        from public.players
       where coalesce((entry->>'runs')::numeric, 0) > 0
         and (k = 'bestScore' or coalesce((entry->>k)::numeric, 0) > 0)
       order by coalesce((entry->>k)::numeric, 0) desc, coalesce((entry->>'levels')::numeric, 0) desc, coalesce((entry->>'gebuk')::numeric, 0) desc
       limit n
    ) s), '[]'::jsonb);
end $$;

-- ----------------------------------------------------------- admin API
create or replace function public.gebok_admin_check(p_key text) returns boolean
language sql stable security definer set search_path = public as $$ select public.gebok_is_admin(p_key) $$;

create or replace function public.gebok_admin_players(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.gebok_is_admin(p_key) then raise exception 'admin key rejected' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(public.gebok_profile(p) order by p.updated_at desc) from public.players p), '[]'::jsonb);
end $$;

create or replace function public.gebok_admin_clear(p_key text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.gebok_is_admin(p_key) then raise exception 'admin key rejected' using errcode = '42501'; end if;
  delete from public.players;
  get diagnostics n = row_count;
  return n;
end $$;

-- -------------------------------------------------------------- grants
revoke execute on function public.gebok_norm(text), public.gebok_profile(public.players), public.gebok_is_admin(text) from public, anon, authenticated;
grant execute on function
  public.gebok_ping(), public.gebok_sign_in(text, text), public.gebok_register(text, text, text, jsonb, jsonb),
  public.gebok_save(text, jsonb, jsonb), public.gebok_leaderboard(text, integer),
  public.gebok_admin_check(text), public.gebok_admin_players(text), public.gebok_admin_clear(text)
  to anon, authenticated;
notify pgrst, 'reload schema';

-- ----------------------------------------------------------- admin key
-- Choose a long secret, replace the value below and run these two lines once.
-- The admin page (#admin) asks for this key and keeps it in that browser.
-- insert into public.app_settings (key, value) values ('admin_key', 'tukar-kepada-rahsia-yang-panjang')
--   on conflict (key) do update set value = excluded.value;

-- ======================================================================
-- Per-game run tables: one row per play, for analysis per mini game
-- (time taken, performance). The game only appends through
-- gebok_record_run; players.data keeps its own copy of the last 300 runs
-- as before, so nothing else changes. Deleting a player removes their rows.
-- Safe to run on a project that already has the tables above.
-- ======================================================================

create table if not exists public.runner_runs (            -- Laksa Gebok Run (3D runner): one row per level played
  id             bigint generated always as identity primary key,
  player_id      text not null references public.players(id) on delete cascade,
  username       text not null,
  played_at      timestamptz not null default now(),
  level          integer not null default 1,
  result         text not null default '',                 -- won / crashed / incomplete
  score          integer not null default 0,               -- this level's score
  campaign_score integer,                                  -- the run total so far
  laksa          integer,  laksa_target integer,
  gebuk          integer,  gebuk_need   integer,
  distance       integer,                                  -- metres
  time_s         numeric,                                  -- seconds played on this level
  time_limit     integer,  time_left numeric, time_bonus integer,
  max_speed      numeric,
  lives_lost     integer,  lives_start integer,
  mission_done   boolean,  finished boolean,
  achievements   text[] not null default '{}',
  details        jsonb not null default '{}'::jsonb         -- the record exactly as the game sent it
);
create table if not exists public.quest_runs (             -- Laksa Quest (platformer): one row per 3-minute run
  id          bigint generated always as identity primary key,
  player_id   text not null references public.players(id) on delete cascade,
  username    text not null,
  played_at   timestamptz not null default now(),
  result      text not null default '',                    -- timeout (clock ran out) / crashed (no hearts left)
  score       integer not null default 0,
  bowls       integer,
  time_s      numeric,                                     -- seconds played (180 on timeout)
  lives_left  integer,
  coins       integer, ingredients integer, rares integer, hits integer, stomps integer,
  details     jsonb not null default '{}'::jsonb
);
create table if not exists public.crossword_runs (         -- Teka Silang Laksa: one row per puzzle
  id          bigint generated always as identity primary key,
  player_id   text not null references public.players(id) on delete cascade,
  username    text not null,
  played_at   timestamptz not null default now(),
  result      text not null default '',                    -- won / timeout
  score       integer not null default 0,
  time_s      numeric,                                     -- seconds to finish (the limit on timeout)
  hints       integer,
  words       integer,
  details     jsonb not null default '{}'::jsonb
);
create table if not exists public.wordsearch_runs (        -- Cari Kata Laksa: one row per panel played
  id          bigint generated always as identity primary key,
  player_id   text not null references public.players(id) on delete cascade,
  username    text not null,
  played_at   timestamptz not null default now(),
  panel       integer,                                     -- which of the 10 word panels (1–10)
  result      text not null default '',                    -- won / timeout
  score       integer not null default 0,
  time_s      numeric,                                     -- seconds to finish (300 on timeout)
  hints       integer,
  words       integer, found integer,
  details     jsonb not null default '{}'::jsonb
);
create index if not exists runner_runs_player_idx     on public.runner_runs (player_id, played_at desc);
create index if not exists quest_runs_player_idx      on public.quest_runs (player_id, played_at desc);
create index if not exists crossword_runs_player_idx  on public.crossword_runs (player_id, played_at desc);
create index if not exists wordsearch_runs_player_idx on public.wordsearch_runs (player_id, played_at desc);
create index if not exists runner_runs_played_idx     on public.runner_runs (played_at desc);
create index if not exists quest_runs_played_idx      on public.quest_runs (played_at desc);
create index if not exists crossword_runs_played_idx  on public.crossword_runs (played_at desc);
create index if not exists wordsearch_runs_played_idx on public.wordsearch_runs (played_at desc);

alter table public.runner_runs     enable row level security;
alter table public.quest_runs      enable row level security;
alter table public.crossword_runs  enable row level security;
alter table public.wordsearch_runs enable row level security;
revoke all on table public.runner_runs, public.quest_runs, public.crossword_runs, public.wordsearch_runs from anon, authenticated;

-- JSON field readers that never fail on a missing or oddly typed value.
create or replace function public.gebok_jint(r jsonb, k text) returns integer
language sql immutable as $$ select case when jsonb_typeof(r->k) = 'number' then round((r->>k)::numeric)::integer end $$;
create or replace function public.gebok_jnum(r jsonb, k text) returns numeric
language sql immutable as $$ select case when jsonb_typeof(r->k) = 'number' then (r->>k)::numeric end $$;
create or replace function public.gebok_jbool(r jsonb, k text) returns boolean
language sql immutable as $$ select case when jsonb_typeof(r->k) = 'boolean' then (r->>k)::boolean end $$;

-- Appends one play to the game's table (p_game: runner / platform / crossword / wordsearch; p_rec: the
-- record the game keeps in players.data.runs). Returns the new row id, null when the player no longer exists.
create or replace function public.gebok_record_run(p_id text, p_game text, p_rec jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  u text;
  n bigint;
  r jsonb := coalesce(p_rec, '{}'::jsonb);
  t timestamptz := now();
begin
  select username into u from public.players where id = p_id;
  if not found then return null; end if;
  if pg_column_size(r) > 100000 then raise exception 'record too large' using errcode = '22023'; end if;
  begin
    t := coalesce(nullif(r->>'at', '')::timestamptz, now());
  exception when others then
    t := now();
  end;
  if p_game = 'runner' then
    insert into public.runner_runs (player_id, username, played_at, level, result, score, campaign_score, laksa, laksa_target, gebuk, gebuk_need, distance,
                                    time_s, time_limit, time_left, time_bonus, max_speed, lives_lost, lives_start, mission_done, finished, achievements, details)
    values (p_id, u, t, coalesce(public.gebok_jint(r, 'level'), 1), coalesce(r->>'result', ''), coalesce(public.gebok_jint(r, 'score'), 0),
            public.gebok_jint(r, 'campaignScore'), public.gebok_jint(r, 'laksa'), public.gebok_jint(r, 'laksaTarget'), public.gebok_jint(r, 'gebuk'), public.gebok_jint(r, 'need'), public.gebok_jint(r, 'distance'),
            public.gebok_jnum(r, 'time'), public.gebok_jint(r, 'timeLimit'), public.gebok_jnum(r, 'timeLeft'), public.gebok_jint(r, 'timeBonus'), public.gebok_jnum(r, 'maxSpeed'),
            public.gebok_jint(r, 'livesLost'), public.gebok_jint(r, 'livesStart'), public.gebok_jbool(r, 'missionDone'), public.gebok_jbool(r, 'finished'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(r->'achievements') = 'array' then r->'achievements' else '[]'::jsonb end) as x), '{}'::text[]), r)
    returning id into n;
  elsif p_game = 'platform' then
    insert into public.quest_runs (player_id, username, played_at, result, score, bowls, time_s, lives_left, coins, ingredients, rares, hits, stomps, details)
    values (p_id, u, t, coalesce(r->>'result', ''), coalesce(public.gebok_jint(r, 'score'), 0), public.gebok_jint(r, 'bowls'), public.gebok_jnum(r, 'time'), public.gebok_jint(r, 'lives'),
            public.gebok_jint(r, 'coins'), public.gebok_jint(r, 'ingredients'), public.gebok_jint(r, 'rares'), public.gebok_jint(r, 'hits'), public.gebok_jint(r, 'stomps'), r)
    returning id into n;
  elsif p_game = 'crossword' then
    insert into public.crossword_runs (player_id, username, played_at, result, score, time_s, hints, words, details)
    values (p_id, u, t, coalesce(r->>'result', ''), coalesce(public.gebok_jint(r, 'score'), 0), public.gebok_jnum(r, 'time'), public.gebok_jint(r, 'hints'), public.gebok_jint(r, 'words'), r)
    returning id into n;
  elsif p_game = 'wordsearch' then
    insert into public.wordsearch_runs (player_id, username, played_at, panel, result, score, time_s, hints, words, found, details)
    values (p_id, u, t, public.gebok_jint(r, 'panel'), coalesce(r->>'result', ''), coalesce(public.gebok_jint(r, 'score'), 0), public.gebok_jnum(r, 'time'),
            public.gebok_jint(r, 'hints'), public.gebok_jint(r, 'words'), public.gebok_jint(r, 'found'), r)
    returning id into n;
  else
    raise exception 'unknown game' using errcode = '22023';
  end if;
  return n;
end $$;

revoke execute on function public.gebok_jint(jsonb, text), public.gebok_jnum(jsonb, text), public.gebok_jbool(jsonb, text) from public, anon, authenticated;
grant execute on function public.gebok_record_run(text, text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
