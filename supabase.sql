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
