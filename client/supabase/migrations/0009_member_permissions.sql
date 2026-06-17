-- 0009_member_permissions.sql — per-member permission overrides.
--
-- Each member keeps their ROLE defaults, but the owner can now grant or revoke
-- individual permissions per person (e.g. let one cashier see finances). The
-- override map lives in store_members.permissions ({} = pure role defaults, so
-- existing/new staff behave exactly as before).
--
-- `member_can(store, perm)` returns the effective permission (override ?? role
-- default) and is what the RLS policies use, so a grant works at the DATABASE
-- level — not just in the UI.
--
-- Run once in the Supabase SQL editor, after 0008_staff_sessions.sql.

alter table store_members add column if not exists permissions jsonb not null default '{}'::jsonb;

create or replace function member_can(sid uuid, perm text)
returns boolean language sql security definer set search_path = public as $$
  with me as (
    select role, active, permissions
    from store_members
    where store_id = sid and user_id = auth.uid()
    limit 1
  )
  select coalesce(
    -- explicit per-member override for this permission, when set
    (select (permissions ->> perm)::boolean from me where active),
    -- otherwise the role default (mirrors the role rules from 0002)
    (select case
        when perm = 'sell' then true
        when perm in ('manage_inventory', 'view_finance') then role in ('owner', 'manager')
        when perm = 'use_assistant' then true
        when perm in ('manage_staff', 'manage_settings') then role = 'owner'
        else false
      end
      from me where active),
    false
  );
$$;

-- Inventory writes now follow `manage_inventory` (role default OR override).
-- Reads stay open to every member (a cashier must see the catalog to sell).
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'product_variants', 'categories', 'stock_movements',
    'suppliers', 'purchase_orders', 'promotions'
  ] loop
    execute format('drop policy if exists %1$s_write on %1$s;', t);
    execute format(
      $f$create policy %1$s_write on %1$s for all
        using (member_can(store_id, 'manage_inventory'))
        with check (member_can(store_id, 'manage_inventory'));$f$, t);
  end loop;
end $$;

-- Finance ledger + financing now follow `view_finance` (role default OR override).
do $$
declare t text;
begin
  foreach t in array array['transactions', 'financing_plans', 'installments'] loop
    execute format('drop policy if exists %1$s_rw on %1$s;', t);
    execute format(
      $f$create policy %1$s_rw on %1$s for all
        using (member_can(store_id, 'view_finance'))
        with check (member_can(store_id, 'view_finance'));$f$, t);
  end loop;
end $$;

grant execute on function member_can(uuid, text) to authenticated;
