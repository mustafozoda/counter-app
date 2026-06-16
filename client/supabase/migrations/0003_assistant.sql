-- 0003_assistant.sql — AI assistant chat history, scoped per user.
--
-- Each signed-in user (any role: owner, manager, cashier, …) gets their own
-- private conversation history, synced across devices. NOT tied to a store —
-- a cashier's chats are theirs alone and never shared with the owner.
--
-- Run this once in the Supabase SQL editor, after 0001_init.sql and
-- 0002_roles.sql.

create table if not exists assistant_conversations (
  -- Client-generated id (matches the app's local ids) so the same conversation
  -- object works offline and online.
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title       text not null default '',
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Newest-first listing per user.
create index if not exists assistant_conversations_user_idx
  on assistant_conversations (user_id, updated_at desc);

alter table assistant_conversations enable row level security;

-- A user can only ever see and manage their own conversations.
create policy assistant_conversations_select on assistant_conversations
  for select using (user_id = auth.uid());
create policy assistant_conversations_insert on assistant_conversations
  for insert with check (user_id = auth.uid());
create policy assistant_conversations_update on assistant_conversations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy assistant_conversations_delete on assistant_conversations
  for delete using (user_id = auth.uid());
