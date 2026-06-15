-- Counter — role-based access: staff invites + role-aware Row Level Security.
--
-- Apply AFTER 0001_init.sql: Supabase dashboard → SQL Editor → paste → Run.
-- Safe to re-run.
--
-- Model: the person who creates a store is its `owner`. The owner invites staff
-- by email and assigns each a role (`manager` / `cashier`). Invited people
-- inherit that role when they sign up. Roles map to permissions in the app
-- (src/stores/staff.ts) AND are enforced here in the database.

-- ===========================================================================
-- Helpers
-- ===========================================================================

-- Is the caller a member of this store holding one of the given roles?
create or replace function is_store_role(sid uuid, roles text[])
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from store_members m
    where m.store_id = sid and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

-- ===========================================================================
-- Staff invites
-- ===========================================================================

-- Add or update a staff member (owner only). If an auth user with that email
-- already exists, link them immediately; otherwise the signup trigger links
-- them when they join. Re-inviting the same email updates name/role.
create or replace function add_store_member(
  p_store_id uuid, p_name text, p_email text, p_role text
) returns store_members language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_row store_members;
begin
  if not is_store_owner(p_store_id) then raise exception 'Only the owner can manage staff'; end if;
  if p_role not in ('owner', 'manager', 'cashier') then raise exception 'Invalid role'; end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;

  insert into store_members (store_id, user_id, name, email, role)
  values (p_store_id, v_uid, p_name, p_email, p_role)
  on conflict (store_id, email) do update
    set name = excluded.name,
        role = excluded.role,
        user_id = coalesce(store_members.user_id, excluded.user_id)
  returning * into v_row;

  return v_row;
end;
$$;

-- When a new user signs up, attach them to any membership rows pre-created for
-- their email so invited staff join their store instead of onboarding a new one.
create or replace function link_pending_memberships()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update store_members
    set user_id = new.id
    where user_id is null and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function link_pending_memberships();

-- ===========================================================================
-- Role-aware RLS — tighten the uniform member policies from 0001.
--
-- Reads stay open to all members (a cashier must see the catalog to sell);
-- sensitive WRITES and the finance ledger require the matching role. Sales,
-- refunds, stock moves and installment payments run through SECURITY DEFINER
-- RPCs, so they keep working for cashiers regardless of these table policies.
-- ===========================================================================

-- Inventory: any member reads; owner/manager (manage_inventory) writes.
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'product_variants', 'categories', 'stock_movements',
    'suppliers', 'purchase_orders', 'promotions'
  ] loop
    execute format('drop policy if exists %1$s_rw on %1$s;', t);
    execute format('drop policy if exists %1$s_select on %1$s;', t);
    execute format('drop policy if exists %1$s_write on %1$s;', t);
    execute format(
      'create policy %1$s_select on %1$s for select using (is_store_member(store_id));', t);
    execute format(
      $f$create policy %1$s_write on %1$s for all
        using (is_store_role(store_id, array['owner','manager']))
        with check (is_store_role(store_id, array['owner','manager']));$f$, t);
  end loop;
end $$;

-- Finance ledger + financing: owner/manager (view_finance) only, read & write.
do $$
declare t text;
begin
  foreach t in array array['transactions', 'financing_plans', 'installments'] loop
    execute format('drop policy if exists %1$s_rw on %1$s;', t);
    execute format(
      $f$create policy %1$s_rw on %1$s for all
        using (is_store_role(store_id, array['owner','manager']))
        with check (is_store_role(store_id, array['owner','manager']));$f$, t);
  end loop;
end $$;

-- Store settings: owner only (manage_settings). Members still read the store.
drop policy if exists stores_update on stores;
create policy stores_update on stores for update
  using (is_store_owner(id)) with check (is_store_owner(id));

-- orders / order_items / payments / refunds keep their member-level policies
-- from 0001 — every role can ring up and view sales.

-- ===========================================================================
-- Grants (re-run so the new functions are callable by the app)
-- ===========================================================================

grant execute on all functions in schema public to authenticated;
