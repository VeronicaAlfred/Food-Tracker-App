-- Recovery Plate: one row of app data per signed-in user.
-- Run this once in Supabase > SQL Editor.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Each user can only see and change their own row.
drop policy if exists "user_state_select_own" on public.user_state;
drop policy if exists "user_state_insert_own" on public.user_state;
drop policy if exists "user_state_update_own" on public.user_state;
drop policy if exists "user_state_delete_own" on public.user_state;

create policy "user_state_select_own" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_state_insert_own" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_state_update_own" on public.user_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_state_delete_own" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The anonymous (signed-out) role gets no access at all.
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;
