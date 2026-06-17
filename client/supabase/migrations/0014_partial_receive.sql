-- 0014_partial_receive.sql — Phase 3b: review-before-receive + partial deliveries.
--
-- Receiving a purchase order is no longer all-or-nothing. The merchant confirms
-- how many of each line actually arrived and at what cost; whatever's short
-- stays open (status 'partial') so the remainder can be received later. Each
-- received line bumps stock through the ledger, sets the product's last cost,
-- fills in a missing supplier, and the batch is logged as one inventory expense.
--
-- Run once in the Supabase SQL editor, after 0013_receive_stock.sql.

-- 1. Allow the new 'partial' status.
alter table purchase_orders drop constraint if exists purchase_orders_status_check;
alter table purchase_orders add constraint purchase_orders_status_check
  check (status in ('draft', 'ordered', 'partial', 'received', 'cancelled'));

-- 2. Receive specific quantities. p_receipts: [{variantId, qty, unitCost}] — the
--    lines (and confirmed costs) being received right now. Lines absent or with
--    qty 0 are left untouched.
create or replace function receive_purchase_order_items(p_id uuid, p_receipts jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_po          purchase_orders;
  v_rec         jsonb;
  v_item        jsonb;
  v_new_items   jsonb := '[]'::jsonb;
  v_vid         uuid;
  v_recv        int;
  v_cost        numeric;
  v_ordered     int;
  v_received    int;
  v_total_recv  int := 0;
  v_total_order int := 0;
  v_expense     numeric := 0;
  v_status      text;
  v_product     uuid;
begin
  select * into v_po from purchase_orders where id = p_id;
  if not found then raise exception 'Purchase order not found'; end if;
  if not member_can(v_po.store_id, 'manage_inventory') then raise exception 'Forbidden'; end if;
  if v_po.status in ('received', 'cancelled') then return; end if;

  -- Apply each receipt: stock in, last-cost, supplier backfill, accumulate spend.
  for v_rec in select elem from jsonb_array_elements(coalesce(p_receipts, '[]'::jsonb)) as t(elem) loop
    v_vid  := (v_rec->>'variantId')::uuid;
    v_recv := coalesce((v_rec->>'qty')::int, 0);
    v_cost := coalesce((v_rec->>'unitCost')::numeric, 0);
    if v_recv <= 0 then continue; end if;
    perform adjust_stock(v_vid, v_recv, 'restock', 'Purchase order received');
    v_expense := v_expense + round(v_cost * v_recv, 2);
    select product_id into v_product from product_variants where id = v_vid;
    if v_product is not null then
      if v_cost > 0 then update products set cost = v_cost where id = v_product; end if;
      if v_po.supplier_id is not null then
        update products set supplier_id = v_po.supplier_id
          where id = v_product and supplier_id is null;
      end if;
    end if;
  end loop;

  -- Rebuild the items array with cumulative receivedQty + confirmed unitCost.
  for v_item in select elem from jsonb_array_elements(coalesce(v_po.items, '[]'::jsonb)) as t(elem) loop
    v_vid     := (v_item->>'variantId')::uuid;
    v_ordered := coalesce((v_item->>'qty')::int, 0);
    v_received := coalesce((v_item->>'receivedQty')::int, 0);
    v_recv := 0;
    v_cost := coalesce((v_item->>'unitCost')::numeric, 0);
    select coalesce((r->>'qty')::int, 0), coalesce((r->>'unitCost')::numeric, v_cost)
      into v_recv, v_cost
      from jsonb_array_elements(coalesce(p_receipts, '[]'::jsonb)) as r
      where (r->>'variantId')::uuid = v_vid
      limit 1;
    v_recv := coalesce(v_recv, 0);
    v_cost := coalesce(v_cost, coalesce((v_item->>'unitCost')::numeric, 0));
    v_received := v_received + v_recv;
    v_new_items := v_new_items || jsonb_build_object(
      'variantId', v_vid, 'qty', v_ordered, 'unitCost', v_cost, 'receivedQty', v_received);
    v_total_recv  := v_total_recv + v_received;
    v_total_order := v_total_order + v_ordered;
  end loop;

  if v_total_recv >= v_total_order then
    v_status := 'received';
  elsif v_total_recv > 0 then
    v_status := 'partial';
  else
    v_status := v_po.status;
  end if;

  update purchase_orders
    set items = v_new_items,
        status = v_status,
        total_cost = (
          select coalesce(sum((i->>'qty')::numeric * (i->>'unitCost')::numeric), 0)
          from jsonb_array_elements(v_new_items) as i
        )
    where id = p_id;

  if v_expense > 0 then
    insert into transactions (store_id, type, category, amount, note)
    values (v_po.store_id, 'expense', 'inventory', v_expense, 'Purchase order received');
  end if;
end;
$$;

grant execute on function receive_purchase_order_items(uuid, jsonb) to authenticated;
