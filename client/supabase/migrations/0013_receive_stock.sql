-- 0013_receive_stock.sql — Phase 3c: restock that captures cost.
--
-- A purchase-style restock: bump stock (through the movement ledger), set the
-- product's last cost, optionally set its supplier, and record the inventory
-- spend as a cash-flow expense — all atomically. Plain count-corrections keep
-- using adjust_stock (no money). COGS/profit are unaffected (they come from the
-- per-line sale snapshot, not from this expense).
--
-- Run once in the Supabase SQL editor, after 0012_product_supplier.sql.

create or replace function receive_stock(
  p_variant_id uuid, p_qty int, p_unit_cost numeric, p_supplier_id uuid, p_reason text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
  v_product uuid;
begin
  select pv.store_id, pv.product_id into v_store, v_product
    from product_variants pv where pv.id = p_variant_id;
  if v_store is null then raise exception 'Variant not found'; end if;
  if not member_can(v_store, 'manage_inventory') then raise exception 'Forbidden'; end if;

  perform adjust_stock(p_variant_id, p_qty, 'restock', coalesce(nullif(p_reason, ''), 'Stock received'));

  -- Last-cost: the most recent purchase price becomes the product cost.
  if p_unit_cost is not null and p_unit_cost > 0 then
    update products set cost = p_unit_cost where id = v_product;
    insert into transactions (store_id, type, category, amount, note)
    values (v_store, 'expense', 'inventory', round(p_unit_cost * p_qty, 2),
            coalesce(nullif(p_reason, ''), 'Stock received'));
  end if;

  -- Fill in the supplier if the product doesn't have one yet.
  if p_supplier_id is not null then
    update products set supplier_id = p_supplier_id where id = v_product and supplier_id is null;
  end if;
end;
$$;

grant execute on function receive_stock(uuid, int, numeric, uuid, text) to authenticated;
