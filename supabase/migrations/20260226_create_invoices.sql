-- Vendors
create table public.vendors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  tax_id text,
  email text,
  phone text,
  created_at timestamptz default now() not null
);

create index idx_vendors_name on public.vendors (name);

-- Customers
create table public.customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  tax_id text,
  created_at timestamptz default now() not null
);

create index idx_customers_name on public.customers (name);

-- Invoices
create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  file_name text not null,
  invoice_number text not null,
  invoice_date date,
  due_date date,
  currency text not null default 'EUR',
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  raw_extraction jsonb not null, -- full AI response for reference
  created_at timestamptz default now() not null
);

create index idx_invoices_invoice_number on public.invoices (invoice_number);
create index idx_invoices_created_at on public.invoices (created_at desc);
create index idx_invoices_vendor_id on public.invoices (vendor_id);
create index idx_invoices_customer_id on public.invoices (customer_id);

-- Line items
create table public.line_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position smallint,
  description text not null,
  quantity numeric(12,4) not null default 0,
  unit_price numeric(12,4) not null default 0,
  tax_rate numeric(5,2),
  line_total numeric(12,2) not null default 0
);

create index idx_line_items_invoice_id on public.line_items (invoice_id);

-- Payment info
create table public.payment_info (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid not null unique references public.invoices(id) on delete cascade,
  iban text,
  swift text,
  bank_name text,
  terms text
);

create index idx_payment_info_invoice_id on public.payment_info (invoice_id);

-- Enable RLS on all tables
alter table public.vendors enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.line_items enable row level security;
alter table public.payment_info enable row level security;

-- Allow anonymous access for local development
create policy "Allow all access" on public.vendors for all using (true) with check (true);
create policy "Allow all access" on public.customers for all using (true) with check (true);
create policy "Allow all access" on public.invoices for all using (true) with check (true);
create policy "Allow all access" on public.line_items for all using (true) with check (true);
create policy "Allow all access" on public.payment_info for all using (true) with check (true);
