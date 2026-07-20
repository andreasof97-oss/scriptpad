-- ============================================================
-- ScriptPad — Fix: stop team members from making themselves managers
-- Paste this whole file into: Supabase → SQL Editor → New query → Run
-- Safe to run more than once.
-- ============================================================
--
-- THE PROBLEM
-- The original insert rule on team_members only checked WHO you are, not what
-- ROLE you were claiming:
--
--     create policy members_insert_self on public.team_members
--       for insert with check (user_id = auth.uid());
--
-- Because a member can also delete their own membership row, any ordinary
-- agent could: delete their "agent" row, then insert a new row for the same
-- team with role = 'manager'. That handed them full manager powers — reading,
-- editing, and DELETING the whole team's shared scripts.
--
-- THE FIX
-- Tighten the rule so a self-insert can create a 'manager' row ONLY when you
-- are the team's owner (that is how creating a team makes you its manager).
-- Everyone else can only insert themselves as an 'agent'. An ordinary agent
-- cannot become a manager this way because they do not own the team, and the
-- separate members_update policy already limits role changes to managers.
-- Joining still works because join_team_by_code always inserts role = 'agent'.
-- ============================================================

drop policy if exists members_insert_self on public.team_members;
create policy members_insert_self on public.team_members
  for insert
  with check (
    user_id = auth.uid()
    and (
      role = 'agent'
      or (
        role = 'manager'
        and exists (
          select 1 from public.teams t
          where t.id = team_id and t.owner_id = auth.uid()
        )
      )
    )
  );

-- ============================================================
-- Done. Agents can join teams, but can no longer self-promote to manager.
-- ============================================================
