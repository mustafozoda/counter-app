-- Counter — initial Supabase schema (online-first backend).
--
-- Apply once: Supabase dashboard → SQL Editor → paste this whole file → Run.
-- Safe to re-run (idempotent-ish: uses IF NOT EXISTS / CREATE OR REPLACE).
--
-- Model source of truth: client/src/types/models.ts. Tables are snake_case;
-- the client maps to/from camelCase. Every business table carries store_id and
-- is protected by Row Level Security so a user only ever sees their store.

-- ===========================================================================
-- Tables
-- ===========================================================================

create table if not exists stores (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  vertical          text not null,
  logo_url          text,
  currency_code     text not null,
  tax_rate          numeric not null default 0,
  address           text,
  receipt           jsonb not null default
                      '{"headerText":"","footerText":"","showLogo":true}'::jsonb,
  last_order_number int  not null default 1000,
  created_at        timestamptz not null default now()
);

-- Membership = staff. Owner row links auth.uid() to the store (powers RLS).
-- Staff added by the owner may have a null user_id until they sign up.
create table if not exists store_members (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  email      text not null,
  avatar_url text,
  role       text not null check (role in ('owner','manager','cashier')),
  created_at timestamptz not null default now(),
  unique (store_id, email)
);

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  name       text not null,
  parent_id  uuid references categories(id) on delete set null,
  sort_order int not null default 0
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null,
  description text not null default '',
  brand       text,
  category_id uuid references categories(id) on delete set null,
  images      text[] not null default '{}',
  cost        numeric not null default 0,
  base_price  numeric not null default 0,
  tax_rate    numeric,
  status      text not null default 'active' check (status in ('active','draft','archived')),
  created_at  timestamptz not null default now()
);

create table if not exists product_variants (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references stores(id) on delete cascade,
  product_id          uuid not null references products(id) on delete cascade,
  attributes          jsonb not null default '{}'::jsonb,
  sku                 text not null default '',
  barcode             text,
  stock_qty           int not null default 0,
  price_override      numeric,
  low_stock_threshold int not null default 0
);

create table if not exists stock_movements (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  type       text not null check (type in ('restock','sale','adjustment','return')),
  qty        int not null,
  reason     text,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  addresses     text[] not null default '{}',
  notes         text not null default '',
  loyalty_points int not null default 0,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references stores(id) on delete cascade,
  number             text not null,
  channel            text not null check (channel in ('pos','online')),
  customer_id        uuid references customers(id) on delete set null,
  subtotal           numeric not null,
  discount           numeric not null default 0,
  tax                numeric not null default 0,
  total              numeric not null,
  payment_status     text not null check (payment_status in ('pending','partial','paid','refunded')),
  fulfillment_status text not null check (fulfillment_status in ('pending','fulfilled','shipped','completed','cancelled')),
  created_at         timestamptz not null default now()
);

create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  order_id      uuid not null references orders(id) on delete cascade,
  variant_id    uuid references product_variants(id) on delete set null,
  product_name  text not null,
  variant_label text not null,
  qty           int not null,
  unit_price    numeric not null,
  line_total    numeric not null
);

create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  order_id   uuid not null references orders(id) on delete cascade,
  method     text not null check (method in ('cash','card','transfer','installment')),
  amount     numeric not null,
  status     text not null check (status in ('pending','completed','failed','refunded')),
  ref        text,
  created_at timestamptz not null default now()
);

create table if not exists refunds (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  order_id   uuid not null references orders(id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,
  amount     numeric not null,
  restocked  boolean not null default false,
  reason     text,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  type            text not null check (type in ('income','expense')),
  category        text not null,
  amount          numeric not null,
  note            text not null default '',
  date            timestamptz not null default now(),
  linked_order_id uuid references orders(id) on delete set null,
  receipt_uri     text
);

create table if not exists financing_plans (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  order_id     uuid not null references orders(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  principal    numeric not null,
  down_payment numeric not null default 0,
  frequency    text not null check (frequency in ('weekly','biweekly','monthly')),
  status       text not null check (status in ('active','completed','defaulted','cancelled')),
  created_at   timestamptz not null default now()
);

create table if not exists installments (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  plan_id  uuid not null references financing_plans(id) on delete cascade,
  number   int not null,
  due_date timestamptz not null,
  amount   numeric not null,
  paid_at  timestamptz,
  status   text not null check (status in ('upcoming','due','paid','overdue'))
);

create table if not exists suppliers (
  id      uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name    text not null,
  contact text,
  notes   text not null default ''
);

create table if not exists purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  items       jsonb not null default '[]'::jsonb,
  status      text not null check (status in ('draft','ordered','received','cancelled')),
  total_cost  numeric not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists promotions (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id) on delete cascade,
  name      text not null,
  type      text not null check (type in ('percent','fixed','bogo')),
  value     numeric not null,
  code      text,
  starts_at timestamptz,
  ends_at   timestamptz,
  active    boolean not null default true
);

-- Helpful indexes (RLS filters and common lookups all key on store_id).
create index if not exists idx_store_members_user    on store_members(user_id);
create index if not exists idx_categories_store       on categories(store_id);
create index if not exists idx_products_store         on products(store_id);
create index if not exists idx_variants_product       on product_variants(product_id);
create index if not exists idx_variants_barcode       on product_variants(barcode);
create index if not exists idx_movements_variant      on stock_movements(variant_id);
create index if not exists idx_customers_store        on customers(store_id);
create index if not exists idx_orders_store           on orders(store_id);
create index if not exists idx_order_items_order      on order_items(order_id);
create index if not exists idx_payments_order         on payments(order_id);
create index if not exists idx_refunds_order          on refunds(order_id);
create index if not exists idx_transactions_store     on transactions(store_id);
create index if not exists idx_installments_plan      on installments(plan_id);
create index if not exists idx_purchase_orders_store  on purchase_orders(store_id);
create index if not exists idx_promotions_store       on promotions(store_id);

-- ===========================================================================
-- Membership helpers (SECURITY DEFINER → bypass RLS, avoid policy recursion)
-- ===========================================================================

create or replace function is_store_member(sid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from store_members m where m.store_id = sid and m.user_id = auth.uid()
  );
$$;

create or replace function is_store_owner(sid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from store_members m
    where m.store_id = sid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================

alter table stores            enable row level security;
alter table store_members     enable row level security;
alter table categories        enable row level security;
alter table products          enable row level security;
alter table product_variants  enable row level security;
alter table stock_movements   enable row level security;
alter table customers         enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table payments          enable row level security;
alter table refunds           enable row level security;
alter table transactions      enable row level security;
alter table financing_plans   enable row level security;
alter table installments      enable row level security;
alter table suppliers         enable row level security;
alter table purchase_orders   enable row level security;
alter table promotions        enable row level security;

-- stores: members read/update; insert is done by create_store() only; owner deletes.
drop policy if exists stores_select on stores;
create policy stores_select on stores for select using (is_store_member(id));
drop policy if exists stores_update on stores;
create policy stores_update on stores for update using (is_store_member(id)) with check (is_store_member(id));
drop policy if exists stores_delete on stores;
create policy stores_delete on stores for delete using (is_store_owner(id));

-- store_members: members read the staff list; only the owner manages it.
drop policy if exists members_select on store_members;
create policy members_select on store_members for select using (is_store_member(store_id));
drop policy if exists members_insert on store_members;
create policy members_insert on store_members for insert with check (is_store_owner(store_id));
drop policy if exists members_update on store_members;
create policy members_update on store_members for update using (is_store_owner(store_id)) with check (is_store_owner(store_id));
drop policy if exists members_delete on store_members;
create policy members_delete on store_members for delete using (is_store_owner(store_id));

-- Every other table: full access to members of its store. Applied uniformly.
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','product_variants','stock_movements','customers',
    'orders','order_items','payments','refunds','transactions',
    'financing_plans','installments','suppliers','purchase_orders','promotions'
  ] loop
    execute format('drop policy if exists %1$s_rw on %1$s;', t);
    execute format(
      'create policy %1$s_rw on %1$s for all using (is_store_member(store_id)) with check (is_store_member(store_id));',
      t
    );
  end loop;
end $$;

-- ===========================================================================
-- RPCs — atomic, server-side composites (mirror the old Local*Api logic)
-- ===========================================================================

-- Create a store + the owner's membership in one transaction.
create or replace function create_store(
  p_name text, p_vertical text, p_currency_code text, p_logo_url text,
  p_tax_rate numeric default 0, p_address text default null, p_receipt jsonb default null,
  p_owner_name text default '', p_owner_email text default ''
) returns stores language plpgsql security definer set search_path = public as $$
declare v_store stores;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into stores (owner_id, name, vertical, currency_code, logo_url, tax_rate, address, receipt)
  values (
    auth.uid(), p_name, p_vertical, p_currency_code, p_logo_url, coalesce(p_tax_rate, 0), p_address,
    coalesce(p_receipt, jsonb_build_object(
      'headerText', p_name, 'footerText', 'Thank you for shopping with us!', 'showLogo', true))
  ) returning * into v_store;

  insert into store_members (store_id, user_id, name, email, role)
  values (
    v_store.id, auth.uid(),
    coalesce(nullif(p_owner_name, ''), split_part(coalesce(p_owner_email, ''), '@', 1)),
    p_owner_email, 'owner'
  );
  return v_store;
end;
$$;

-- Inventory move through the ledger; never lets stock go negative.
create or replace function adjust_stock(
  p_variant_id uuid, p_qty_delta int, p_type text, p_reason text
) returns void language plpgsql security definer set search_path = public as $$
declare v_variant product_variants; v_applied int;
begin
  if p_qty_delta = 0 then return; end if;
  select * into v_variant from product_variants where id = p_variant_id;
  if not found then raise exception 'Variant not found'; end if;
  if not is_store_member(v_variant.store_id) then raise exception 'Forbidden'; end if;
  v_applied := greatest(p_qty_delta, -v_variant.stock_qty);
  update product_variants set stock_qty = stock_qty + v_applied where id = p_variant_id;
  insert into stock_movements (store_id, variant_id, type, qty, reason)
  values (v_variant.store_id, p_variant_id, p_type, v_applied, p_reason);
end;
$$;

-- Ring up a sale: order + items + payments + income txn + stock + loyalty.
-- p_lines:    [{variantId, productName, variantLabel, qty, unitPrice}]
-- p_payments: [{method, amount, ref}]
-- p_totals:   {subtotal, discount, tax, total}
create or replace function create_sale(
  p_store_id uuid, p_customer_id uuid, p_lines jsonb, p_payments jsonb, p_totals jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid; v_num int; v_number text; v_line jsonb; v_pay jsonb;
  v_received numeric := 0; v_total numeric := (p_totals->>'total')::numeric; v_status text;
begin
  if not is_store_member(p_store_id) then raise exception 'Forbidden'; end if;

  update stores set last_order_number = last_order_number + 1
    where id = p_store_id returning last_order_number into v_num;
  v_number := '#' || v_num;

  select coalesce(sum((elem->>'amount')::numeric), 0) into v_received
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) as t(elem);
  v_status := case when v_received >= v_total - 0.01 then 'paid' else 'partial' end;

  insert into orders (store_id, number, channel, customer_id, subtotal, discount, tax, total, payment_status, fulfillment_status)
  values (
    p_store_id, v_number, 'pos', p_customer_id,
    (p_totals->>'subtotal')::numeric, coalesce((p_totals->>'discount')::numeric, 0),
    coalesce((p_totals->>'tax')::numeric, 0), v_total, v_status, 'completed'
  ) returning id into v_order_id;

  for v_line in select elem from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) as t(elem) loop
    insert into order_items (store_id, order_id, variant_id, product_name, variant_label, qty, unit_price, line_total)
    values (
      p_store_id, v_order_id, (v_line->>'variantId')::uuid, v_line->>'productName', v_line->>'variantLabel',
      (v_line->>'qty')::int, (v_line->>'unitPrice')::numeric,
      round((v_line->>'unitPrice')::numeric * (v_line->>'qty')::int, 2)
    );
    perform adjust_stock((v_line->>'variantId')::uuid, -((v_line->>'qty')::int), 'sale', 'Order ' || v_number);
  end loop;

  for v_pay in select elem from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) as t(elem) loop
    insert into payments (store_id, order_id, method, amount, status, ref)
    values (p_store_id, v_order_id, v_pay->>'method', (v_pay->>'amount')::numeric, 'completed', v_pay->>'ref');
  end loop;

  if v_received > 0 then
    insert into transactions (store_id, type, category, amount, note, linked_order_id)
    values (p_store_id, 'income', 'sales', round(v_received, 2), 'POS sale ' || v_number, v_order_id);
  end if;

  if p_customer_id is not null then
    update customers set loyalty_points = greatest(0, loyalty_points + floor(v_total)::int)
      where id = p_customer_id;
  end if;

  return v_order_id;
end;
$$;

-- Proportional refund: refund + status update + expense txn + optional restock.
-- p_items: [{orderItemId, qty}]
create or replace function refund_order(
  p_order_id uuid, p_items jsonb, p_restock boolean, p_reason text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order orders; v_item order_items; v_it jsonb;
  v_items_value numeric := 0; v_fraction numeric; v_amount numeric; v_refunded numeric; v_refund_id uuid;
begin
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if not is_store_member(v_order.store_id) then raise exception 'Forbidden'; end if;

  for v_it in select elem from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as t(elem) loop
    select * into v_item from order_items where id = (v_it->>'orderItemId')::uuid;
    if found then
      v_items_value := v_items_value + v_item.unit_price * least((v_it->>'qty')::int, v_item.qty);
    end if;
  end loop;

  if v_order.subtotal <= 0 then v_fraction := 0;
  else v_fraction := least(1, v_items_value / v_order.subtotal); end if;
  v_amount := round(v_order.total * v_fraction, 2);

  insert into refunds (store_id, order_id, items, amount, restocked, reason)
  values (v_order.store_id, p_order_id, coalesce(p_items, '[]'::jsonb), v_amount, p_restock, p_reason)
  returning id into v_refund_id;

  select coalesce(sum(amount), 0) into v_refunded from refunds where order_id = p_order_id;
  if v_refunded >= v_order.total - 0.01 then
    update orders set payment_status = 'refunded', fulfillment_status = 'cancelled' where id = p_order_id;
  else
    update orders set payment_status = 'partial' where id = p_order_id;
  end if;

  insert into transactions (store_id, type, category, amount, note, linked_order_id)
  values (
    v_order.store_id, 'expense', 'refunds', v_amount,
    'Refund ' || v_order.number || case when coalesce(p_reason, '') <> '' then ' — ' || p_reason else '' end,
    p_order_id
  );

  if p_restock then
    for v_it in select elem from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as t(elem) loop
      select * into v_item from order_items where id = (v_it->>'orderItemId')::uuid;
      if found and v_item.variant_id is not null then
        perform adjust_stock(v_item.variant_id, least((v_it->>'qty')::int, v_item.qty), 'return', 'Refund ' || v_order.number);
      end if;
    end loop;
  end if;

  return v_refund_id;
end;
$$;

-- Receive a PO: mark received, restock each line, log the inventory expense.
create or replace function receive_purchase_order(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_po purchase_orders; v_it jsonb;
begin
  select * into v_po from purchase_orders where id = p_id;
  if not found then return; end if;
  if not is_store_member(v_po.store_id) then raise exception 'Forbidden'; end if;
  if v_po.status = 'received' then return; end if;

  update purchase_orders set status = 'received' where id = p_id;
  for v_it in select elem from jsonb_array_elements(coalesce(v_po.items, '[]'::jsonb)) as t(elem) loop
    perform adjust_stock((v_it->>'variantId')::uuid, (v_it->>'qty')::int, 'restock', 'Purchase order received');
  end loop;
  if v_po.total_cost > 0 then
    insert into transactions (store_id, type, category, amount, note, linked_order_id)
    values (v_po.store_id, 'expense', 'inventory', v_po.total_cost, 'Purchase order received', null);
  end if;
end;
$$;

-- Mark an installment paid: stamp it, complete the plan if last, log income.
create or replace function mark_installment_paid(p_plan_id uuid, p_installment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_plan financing_plans; v_inst installments; v_count int; v_unpaid int;
begin
  select * into v_plan from financing_plans where id = p_plan_id;
  if not found then raise exception 'Plan not found'; end if;
  if not is_store_member(v_plan.store_id) then raise exception 'Forbidden'; end if;
  select * into v_inst from installments where id = p_installment_id;
  if not found then raise exception 'Installment not found'; end if;
  if v_inst.paid_at is not null then return; end if;

  update installments set paid_at = now(), status = 'paid' where id = p_installment_id;

  select count(*) into v_unpaid from installments where plan_id = p_plan_id and paid_at is null;
  if v_unpaid = 0 then update financing_plans set status = 'completed' where id = p_plan_id; end if;

  select count(*) into v_count from installments where plan_id = p_plan_id;
  insert into transactions (store_id, type, category, amount, note, linked_order_id)
  values (
    v_plan.store_id, 'income', 'installments', v_inst.amount,
    'Installment ' || v_inst.number || '/' || v_count, v_plan.order_id
  );
end;
$$;

-- ===========================================================================
-- Storage: a public bucket for product photos + store logos
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('store-media', 'store-media', true)
on conflict (id) do nothing;

drop policy if exists store_media_insert on storage.objects;
create policy store_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media');
drop policy if exists store_media_update on storage.objects;
create policy store_media_update on storage.objects for update to authenticated
  using (bucket_id = 'store-media');
drop policy if exists store_media_delete on storage.objects;
create policy store_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'store-media');
-- Public read is provided by the bucket being public (objects served via URL).

-- ===========================================================================
-- Grants — expose tables/functions to the PostgREST roles (RLS still applies)
-- ===========================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
