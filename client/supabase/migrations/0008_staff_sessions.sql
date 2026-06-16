-- 0008_staff_sessions.sql — track staff login sessions / time in app.
--
-- The app opens a session row when a member starts using the app and heartbeats
-- `last_seen_at` every ~minute while it's foregrounded (a new session is opened
-- after a long idle gap, so background time isn't counted). Active time per
-- staffer ≈ sum(last_seen_at - started_at).
--
-- Run once in the Supabase SQL editor, after 0007_staff_activity.sql.

create table if not exists staff_sessions (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid references stores(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists staff_sessions_idx on staff_sessions (store_id, user_id, started_at desc);

alter table staff_sessions enable row level security;

-- Members write their own sessions; the owner can read the whole store's.
create policy staff_sessions_insert on staff_sessions
  for insert with check (user_id = auth.uid());
create policy staff_sessions_update on staff_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy staff_sessions_select on staff_sessions
  for select using (user_id = auth.uid() or is_store_owner(store_id));

-- Per-staff active minutes + last-seen for a period (owner only).
create or replace function staff_hours(p_store_id uuid, p_since timestamptz default null)
returns table(user_id uuid, minutes numeric, last_seen timestamptz)
language sql security definer set search_path = public as $$
  select s.user_id,
         coalesce(sum(extract(epoch from (s.last_seen_at - s.started_at)) / 60.0), 0)::numeric,
         max(s.last_seen_at)
  from staff_sessions s
  where s.store_id = p_store_id
    and is_store_owner(p_store_id)
    and (p_since is null or s.started_at >= p_since)
  group by s.user_id;
$$;

grant execute on function staff_hours(uuid, timestamptz) to authenticated;
