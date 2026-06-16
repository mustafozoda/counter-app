-- 0007_staff_activity.sql — attribute store activity to the staffer who did it,
-- and expose owner-only stats + a history feed.
--
-- Sales/refunds/stock changes run through SECURITY DEFINER RPCs as the calling
-- staffer, so a BEFORE INSERT trigger can stamp `created_by = auth.uid()`
-- WITHOUT touching any of that money-path logic. Past rows stay unattributed
-- (created_by null), which the app shows as "—".
--
-- Run once in the Supabase SQL editor, after 0006_membership_status.sql.

alter table orders          add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table refunds         add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table stock_movements add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function stamp_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_created_by on orders;
create trigger orders_stamp_created_by before insert on orders
  for each row execute function stamp_created_by();

drop trigger if exists refunds_stamp_created_by on refunds;
create trigger refunds_stamp_created_by before insert on refunds
  for each row execute function stamp_created_by();

drop trigger if exists stock_movements_stamp_created_by on stock_movements;
create trigger stock_movements_stamp_created_by before insert on stock_movements
  for each row execute function stamp_created_by();

-- Per-staff sales totals (owner only). p_since null = all time.
create or replace function staff_sales_stats(p_store_id uuid, p_since timestamptz default null)
returns table(user_id uuid, sales_count bigint, revenue numeric)
language sql security definer set search_path = public as $$
  select o.created_by, count(*)::bigint, coalesce(sum(o.total), 0)
  from orders o
  where o.store_id = p_store_id
    and is_store_owner(p_store_id)
    and o.created_by is not null
    and (p_since is null or o.created_at >= p_since)
  group by o.created_by;
$$;

-- Unified store history (owner only): sales, refunds, and stock restocks/
-- adjustments/returns, each tagged with who did it. Sale-type stock moves are
-- excluded since the sale itself already appears.
create or replace function store_activity(p_store_id uuid, p_limit int default 100)
returns table(
  id uuid,
  kind text,
  actor_id uuid,
  actor_name text,
  summary text,
  amount numeric,
  created_at timestamptz
)
language sql security definer set search_path = public as $$
  select * from (
    select
      o.id as id, 'sale'::text as kind, o.created_by as actor_id,
      (select m.name from store_members m where m.user_id = o.created_by and m.store_id = p_store_id limit 1) as actor_name,
      o.number as summary, o.total as amount, o.created_at as created_at
    from orders o
    where o.store_id = p_store_id

    union all
    select
      r.id, 'refund', r.created_by,
      (select m.name from store_members m where m.user_id = r.created_by and m.store_id = p_store_id limit 1),
      coalesce(r.reason, 'Refund'), -r.amount, r.created_at
    from refunds r
    where r.store_id = p_store_id

    union all
    select
      s.id, s.type, s.created_by,
      (select m.name from store_members m where m.user_id = s.created_by and m.store_id = p_store_id limit 1),
      coalesce(s.reason, s.type), s.qty::numeric, s.created_at
    from stock_movements s
    where s.store_id = p_store_id and s.type in ('restock', 'adjustment', 'return')
  ) feed
  where is_store_owner(p_store_id)
  order by created_at desc
  limit p_limit;
$$;

grant execute on function staff_sales_stats(uuid, timestamptz) to authenticated;
grant execute on function store_activity(uuid, int) to authenticated;
