-- ============================================================
-- ScriptPad Teams Foundation — Supabase setup
-- Paste this whole file into: Supabase → SQL Editor → New query → Run
-- Safe to run once. Creates 3 tables + security rules.
-- ============================================================

-- 1) TEAMS ---------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 2) TEAM MEMBERS -------------------------------------------
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'agent',   -- 'manager' or 'agent'
  joined_at  timestamptz not null default now(),
  unique (team_id, user_id)
);

-- 3) SHARED SCRIPTS -----------------------------------------
create table if not exists public.shared_scripts (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  title        text not null default '',
  body         text default '',
  tags         jsonb default '[]'::jsonb,
  type         text default 'standard',        -- 'standard' or 'branching'
  nodes        jsonb default '[]'::jsonb,
  start_node_id text,
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Helpful index for pull-by-team
create index if not exists shared_scripts_team_idx on public.shared_scripts(team_id);
create index if not exists team_members_user_idx on public.team_members(user_id);

-- ============================================================
-- ROW LEVEL SECURITY — agents only ever see their own team
-- ============================================================
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.shared_scripts enable row level security;

-- Helper: is the current user a member of this team?
create or replace function public.is_team_member(check_team uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team and user_id = auth.uid()
  );
$$;

-- Helper: is the current user a manager/owner of this team?
create or replace function public.is_team_manager(check_team uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team and user_id = auth.uid() and role = 'manager'
  );
$$;

-- ---- teams policies ----
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select using (public.is_team_member(id) or owner_id = auth.uid());

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams
  for insert with check (owner_id = auth.uid());

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update using (owner_id = auth.uid());

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams
  for delete using (owner_id = auth.uid());

-- ---- team_members policies ----
drop policy if exists members_select on public.team_members;
create policy members_select on public.team_members
  for select using (public.is_team_member(team_id));

-- Anyone signed in can add THEMSELVES to a team (joining via invite code)
drop policy if exists members_insert_self on public.team_members;
create policy members_insert_self on public.team_members
  for insert with check (user_id = auth.uid());

-- Managers can remove members; members can remove themselves
drop policy if exists members_delete on public.team_members;
create policy members_delete on public.team_members
  for delete using (user_id = auth.uid() or public.is_team_manager(team_id));

-- Managers can change roles
drop policy if exists members_update on public.team_members;
create policy members_update on public.team_members
  for update using (public.is_team_manager(team_id));

-- ---- shared_scripts policies ----
-- Everyone on the team can READ shared scripts
drop policy if exists shared_select on public.shared_scripts;
create policy shared_select on public.shared_scripts
  for select using (public.is_team_member(team_id));

-- Only managers can create/edit/delete shared scripts (push updates)
drop policy if exists shared_insert on public.shared_scripts;
create policy shared_insert on public.shared_scripts
  for insert with check (public.is_team_manager(team_id));

drop policy if exists shared_update on public.shared_scripts;
create policy shared_update on public.shared_scripts
  for update using (public.is_team_manager(team_id));

drop policy if exists shared_delete on public.shared_scripts;
create policy shared_delete on public.shared_scripts
  for delete using (public.is_team_manager(team_id));

-- ============================================================
-- Done! You now have teams, members, and shared scripts.
-- ============================================================
