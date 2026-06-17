-- 0011_order_item_cost.sql — Phase 1: true profit & margin.
--
-- Snapshot each line's unit COST at sale time so historical profit stays
-- accurate when prices change later. Profit/margin = revenue − COGS, where COGS
-- comes from this per-line snapshot (NOT from inventory-purchase expenses, which
-- belong only to cash flow).
--
-- Run once in the Supabase SQL editor, after 0010_member_realtime.sql.

alter table order_items add column if not exists cost numeric not null default 0;

-- Re-create create_sale to also store the per-line cost (everything else is
-- byte-for-byte the original from 0001).
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
    insert into order_items (store_id, order_id, variant_id, product_name, variant_label, qty, unit_price, line_total, cost)
    values (
      p_store_id, v_order_id, (v_line->>'variantId')::uuid, v_line->>'productName', v_line->>'variantLabel',
      (v_line->>'qty')::int, (v_line->>'unitPrice')::numeric,
      round((v_line->>'unitPrice')::numeric * (v_line->>'qty')::int, 2),
      coalesce((v_line->>'cost')::numeric, 0)
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
