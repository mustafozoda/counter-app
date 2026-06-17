-- 0012_product_supplier.sql — Phase 2: link each product to a supplier.
--
-- Nullable: products keep working without a supplier. on delete set null so
-- removing a supplier just clears the link.
--
-- Run once in the Supabase SQL editor, after 0011_order_item_cost.sql.

alter table products
  add column if not exists supplier_id uuid references suppliers(id) on delete set null;
