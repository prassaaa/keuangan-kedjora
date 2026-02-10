-- Jalankan SQL ini di Supabase SQL Editor

-- Tabel transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  description text not null,
  date timestamptz default now(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  created_at timestamptz default now()
);

-- Index untuk query yang lebih cepat
create index if not exists idx_transactions_date on transactions(date desc);
create index if not exists idx_transactions_type on transactions(type);

-- Enable Row Level Security (opsional, untuk multi-user nanti)
-- alter table transactions enable row level security;

-- Policy untuk akses publik (development)
-- Nanti bisa diganti dengan auth.uid() untuk multi-user

-- Tabel invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  description text not null,
  amount numeric not null,
  date timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_invoices_date on invoices(date desc);
