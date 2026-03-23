-- ==========================================
-- Kamal Office ERP - Supabase Database Schema
-- ==========================================

-- Clients
create table if not exists clients (
  id text primary key,
  name text not null,
  phone text not null default '',
  address text not null default '',
  total_spent numeric(12,2) not null default 0,
  created_at text not null default to_char(current_date, 'YYYY-MM-DD')
);

-- Products
create table if not exists products (
  id text primary key,
  name text not null,
  category text not null default 'ملحقات',
  sku text not null default '',
  description text not null default '',
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 5,
  unit text not null default 'قطعة',
  created_at text not null default to_char(current_date, 'YYYY-MM-DD')
);

-- Invoices (items stored as JSONB array)
create table if not exists invoices (
  id text primary key,
  invoice_number text not null,
  client_id text not null default '',
  client_name text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount_type text not null default 'fixed',
  discount_value numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'غير مدفوعة',
  notes text not null default '',
  created_at text not null default to_char(current_date, 'YYYY-MM-DD')
);

-- Orders
create table if not exists orders (
  id text primary key,
  tracking_id text not null,
  client_id text not null default '',
  client_name text not null default '',
  description text not null default '',
  status text not null default 'قيد الانتظار',
  created_at text not null default to_char(current_date, 'YYYY-MM-DD'),
  updated_at text not null default to_char(current_date, 'YYYY-MM-DD')
);

-- Product Bundles (items stored as JSONB array)
create table if not exists bundles (
  id text primary key,
  name text not null,
  description text not null default '',
  items jsonb not null default '[]'::jsonb,
  discount numeric(5,2) not null default 0,
  created_at text not null default to_char(current_date, 'YYYY-MM-DD')
);

-- App Settings (single row)
create table if not exists app_settings (
  id text primary key default 'default',
  business_name text not null default 'كمال للتجهيزات المكتبية',
  business_name_en text not null default 'Kamal Copy Center',
  phone text not null default '0912345678',
  address text not null default 'حلب - سوريا',
  logo text not null default '',
  currency text not null default 'USD',
  currency_symbol text not null default '$',
  tax_rate numeric(5,2) not null default 0,
  tax_enabled boolean not null default false,
  invoice_prefix text not null default 'INV',
  invoice_notes text not null default 'شكراً لتعاملكم معنا',
  low_stock_warning boolean not null default true,
  primary_color text not null default '#2563eb',
  custom_invoice_html text not null default '',
  product_categories jsonb not null default '["طابعة","حبر","تونر","ورق","ملحقات"]'::jsonb
);

-- Product Images (base64 stored as text)
create table if not exists product_images (
  product_id text primary key,
  image_data text not null default ''
);

-- Insert default settings row
insert into app_settings (id) values ('default') on conflict (id) do nothing;

-- ==========================================
-- Row Level Security (permissive for single-user app)
-- ==========================================
alter table clients enable row level security;
create policy "Allow all on clients" on clients for all using (true) with check (true);

alter table products enable row level security;
create policy "Allow all on products" on products for all using (true) with check (true);

alter table invoices enable row level security;
create policy "Allow all on invoices" on invoices for all using (true) with check (true);

alter table orders enable row level security;
create policy "Allow all on orders" on orders for all using (true) with check (true);

alter table bundles enable row level security;
create policy "Allow all on bundles" on bundles for all using (true) with check (true);

alter table app_settings enable row level security;
create policy "Allow all on app_settings" on app_settings for all using (true) with check (true);

alter table product_images enable row level security;
create policy "Allow all on product_images" on product_images for all using (true) with check (true);
