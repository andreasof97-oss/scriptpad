-- ============================================================
-- ScriptPad — Server-side AI usage cap
-- Paste this whole file into: Supabase → SQL Editor → New query → Run
-- Safe to run more than once.
-- RUN THIS BEFORE deploying the updated ai-assistant function.
-- ============================================================
--
-- WHY
-- The 5/day free AI limit was only counted inside the extension, so it could be
-- bypassed (clear storage, or call the endpoint directly). This enforces a daily
-- limit PER ACCOUNT in the database, so no single login can run up an unlimited
-- AI bill — no matter how many people share it or use it at once.
-- ============================================================

-- One row per user per day, holding that day's request count.
create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count      int  not null default 0,
  primary key (user_id, usage_date)
);

alter table public.ai_usage enable row level security;

-- Users may read their own usage (optional; the extension doesn't need it yet).
-- Nobody can write it directly — only the function below (service role) does.
drop policy if exists ai_usage_select_self on public.ai_usage;
create policy ai_usage_select_self on public.ai_usage
  for select using (user_id = auth.uid());

-- Atomically: if today's count is below the cap, add one and allow; otherwise
-- deny without incrementing. Returns true = allowed, false = over the limit.
create or replace function public.check_and_increment_ai_usage(p_user_id uuid, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count into v_count
  from public.ai_usage
  where user_id = p_user_id and usage_date = current_date
  for update;

  if v_count is null then
    v_count := 0;
  end if;

  if v_count >= p_cap then
    return false;
  end if;

  insert into public.ai_usage (user_id, usage_date, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set count = public.ai_usage.count + 1;

  return true;
end;
$$;

-- Only the backend (service role) may call this — not anonymous or normal users.
revoke all on function public.check_and_increment_ai_usage(uuid, int) from public, anon, authenticated;
grant execute on function public.check_and_increment_ai_usage(uuid, int) to service_role;

-- ============================================================
-- Done. Next: deploy the updated ai-assistant function.
-- ============================================================
