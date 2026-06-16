-- 0005_staff_provisioning.sql — owner-provisioned staff accounts.
--
-- Model change: instead of inviting staff by email (who then self-sign-up), the
-- owner CREATES each staff login + password directly. That account creation and
-- password management happens in the `manage-staff` Edge Function (service-role,
-- owner-verified) — this migration only covers the schema + access rules.
--
-- Adds richer staff fields and an `active` (suspend) flag, and makes the
-- membership helpers respect `active` so a suspended member loses all access.
--
-- Run once in the Supabase SQL editor, after 0004_device_tokens.sql. Safe to re-run.

alter table store_members add column if not exists phone  text;
alter table store_members add column if not exists title  text;   -- job title / position
alter table store_members add column if not exists note   text;   -- owner's private note
alter table store_members add column if not exists active boolean not null default true;

-- Suspended (inactive) members lose store access everywhere, since every RLS
-- policy flows through these helpers.
create or replace function is_store_member(sid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from store_members m
    where m.store_id = sid and m.user_id = auth.uid() and m.active
  );
$$;

create or replace function is_store_owner(sid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from store_members m
    where m.store_id = sid and m.user_id = auth.uid() and m.role = 'owner' and m.active
  );
$$;

create or replace function is_store_role(sid uuid, roles text[])
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from store_members m
    where m.store_id = sid and m.user_id = auth.uid() and m.role = any (roles) and m.active
  );
$$;
