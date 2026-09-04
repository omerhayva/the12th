-- THE 12TH production data model
-- Run this in Supabase SQL Editor when the project is connected.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(), display_name text not null default '12TH PLAYER', avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key, home_team text not null, away_team text not null, home_short text, away_short text,
  home_logo text, away_logo text, home_score integer not null default 0, away_score integer not null default 0,
  minute integer not null default 0, status text not null default 'LIVE' check (status in ('LIVE','HT','FT')),
  kickoff_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.matches add column if not exists home_short text;
alter table public.matches add column if not exists away_short text;
alter table public.matches add column if not exists home_logo text;
alter table public.matches add column if not exists away_logo text;

create table if not exists public.decision_windows (
  id text primary key, match_id text not null references public.matches(id) on delete cascade, minute integer not null,
  question text not null, choices text[] not null, correct_choice text, resolved boolean not null default false,
  resolved_by_event_id text, created_at timestamptz not null default now()
);

create table if not exists public.match_events (
  id text primary key, match_id text not null references public.matches(id) on delete cascade, minute integer not null,
  type text not null, team text, title text not null, description text, created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(), player_id uuid not null references public.players(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade, window_id text not null references public.decision_windows(id) on delete cascade,
  minute integer not null, choice text not null, outcome text, points integer, event_minute integer, event_type text,
  locked_at timestamptz not null default now(), resolved_at timestamptz
);

create unique index if not exists decisions_player_window_unique on public.decisions(player_id, window_id);
create index if not exists decisions_player_idx on public.decisions(player_id);
create index if not exists decisions_match_idx on public.decisions(match_id);
create index if not exists decisions_resolved_idx on public.decisions(points) where points is not null;

create or replace view public.global_leaderboard as
select p.id, p.display_name, count(d.id)::integer as decisions, round(avg(d.points))::integer as iq,
  round((100.0 * avg(case when d.outcome = d.choice then 1 else 0 end)))::integer as accuracy,
  (count(d.id) < 5) as provisional
from public.players p left join public.decisions d on d.player_id = p.id and d.points is not null group by p.id, p.display_name;

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.decision_windows enable row level security;
alter table public.match_events enable row level security;
alter table public.decisions enable row level security;

create policy "public read matches" on public.matches for select using (true);
create policy "public read windows" on public.decision_windows for select using (true);
create policy "public read events" on public.match_events for select using (true);
create policy "public read leaderboard" on public.players for select using (true);

-- Decisions stay server-written. Raw decision rows are not exposed to the public client.
-- Match-level fan pulse should be exposed later as an aggregate/broadcast channel.

alter table public.matches replica identity full;
alter table public.match_events replica identity full;
alter table public.decision_windows replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_events') then
    alter publication supabase_realtime add table public.match_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'decision_windows') then
    alter publication supabase_realtime add table public.decision_windows;
  end if;
end
$$;
