-- 0004_device_tokens.sql — Expo push tokens per device, for remote push.
--
-- The app stores each signed-in device's Expo push token here; a server-side
-- Edge Function (see supabase/functions/notify-order) reads them with the
-- service role to send pushes (e.g. a new order) to the store owner.
--
-- Run once in the Supabase SQL editor, after 0003_assistant.sql.

create table if not exists device_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  platform    text,
  updated_at  timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on device_tokens (user_id);

alter table device_tokens enable row level security;

-- Each user manages only their own device tokens. (The Edge Function uses the
-- service-role key, which bypasses RLS, to read owners' tokens when sending.)
create policy device_tokens_select on device_tokens
  for select using (user_id = auth.uid());
create policy device_tokens_insert on device_tokens
  for insert with check (user_id = auth.uid());
create policy device_tokens_update on device_tokens
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy device_tokens_delete on device_tokens
  for delete using (user_id = auth.uid());
