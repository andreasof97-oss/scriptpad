-- ============================================================
-- ScriptPad — Fix: "team doesn't exist" when joining by invite code
-- Paste this whole file into: Supabase → SQL Editor → New query → Run
-- Safe to run more than once.
-- ============================================================
--
-- THE PROBLEM
-- The security rule on the `teams` table says you may only see a team if you
-- are already a member of it (or you own it):
--
--     create policy teams_select on public.teams
--       for select using (public.is_team_member(id) or owner_id = auth.uid());
--
-- Joining needs to look the team up by invite code BEFORE you are a member.
-- So the lookup returns nothing, and the app reports "team doesn't exist" —
-- even though the code is perfectly valid. A deadlock: you must be a member
-- to see the team, but you must see the team to become a member.
--
-- THE FIX
-- A `security definer` function runs with the privileges of its creator, so it
-- can see the teams table regardless of the caller's own permissions. It only
-- ever reveals a team to someone who already supplied the exact invite code,
-- and it only ever adds the caller themselves as a member — so the teams table
-- stays private and codes remain unguessable.
-- ============================================================

create or replace function public.join_team_by_code(p_code text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select * into v_team
  from public.teams
  where invite_code = upper(btrim(p_code));

  if v_team.id is null then
    raise exception 'bad_code';
  end if;

  -- Add the caller (and only the caller) to the team.
  -- Already a member? Leave the existing row and its role alone.
  insert into public.team_members (team_id, user_id, email, role)
  values (
    v_team.id,
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    'agent'
  )
  on conflict (team_id, user_id) do nothing;

  return v_team;
end;
$$;

-- Only signed-in users may call this. Anonymous visitors cannot.
revoke all on function public.join_team_by_code(text) from public, anon;
grant execute on function public.join_team_by_code(text) to authenticated;

-- ============================================================
-- Done. Joining by invite code should now work for new members.
-- ============================================================
