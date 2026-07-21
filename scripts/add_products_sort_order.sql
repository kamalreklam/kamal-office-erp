-- Adds a persistent, shared display-order column to products so drag-to-reorder
-- in the Advanced Inventory page is saved to the database (not just one browser).
-- Run this once in the Supabase Dashboard → SQL Editor.

alter table products add column if not exists sort_order integer default 0;

-- Backfill existing rows with a sequential order based on creation date, so nothing
-- starts at sort_order = 0 (which would otherwise sort everything into a tie).
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from products
)
update products set sort_order = ordered.rn
from ordered
where products.id = ordered.id;

create index if not exists idx_products_sort_order on products (sort_order);
