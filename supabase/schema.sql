create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null,
  shop_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  license_plate text not null,
  model text not null,
  customer_name text not null,
  phone text not null default '',
  kilometer integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, license_plate)
);

create table if not exists repairs (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  description text not null,
  labor_cost numeric(10,2) not null default 0,
  parts_cost numeric(10,2) not null default 0,
  total_cost numeric(10,2) not null default 0,
  kilometer integer not null default 0,
  payment_status text not null check (payment_status in ('paid', 'unpaid', 'partial')),
  payment_due_date date null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists payment_entries (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references repairs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  paid_at date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  complaint text not null,
  status text not null check (
    status in (
      'received',
      'inspection',
      'in_progress',
      'waiting_parts',
      'waiting_approval',
      'testing',
      'ready',
      'delivered'
    )
  ),
  estimated_delivery_date date null,
  public_tracking_token text not null unique,
  qr_value text not null,
  customer_visible_note text not null default '',
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_order_updates (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  visible_to_customer boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists motorcycles_user_id_idx on motorcycles(user_id);
create index if not exists repairs_user_id_idx on repairs(user_id);
create index if not exists repairs_motorcycle_id_idx on repairs(motorcycle_id);
create index if not exists payment_entries_repair_id_idx on payment_entries(repair_id);
create index if not exists payment_entries_user_id_idx on payment_entries(user_id);
create index if not exists work_orders_user_id_idx on work_orders(user_id);
create index if not exists work_orders_motorcycle_id_idx on work_orders(motorcycle_id);
create index if not exists work_order_updates_work_order_id_idx on work_order_updates(work_order_id);
create index if not exists work_order_updates_user_id_idx on work_order_updates(user_id);

alter table profiles enable row level security;
alter table motorcycles enable row level security;
alter table repairs enable row level security;
alter table payment_entries enable row level security;
alter table work_orders enable row level security;
alter table work_order_updates enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
on profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles for insert
with check (auth.uid() = id);

drop policy if exists "motorcycles_manage_own" on motorcycles;
create policy "motorcycles_manage_own"
on motorcycles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "repairs_manage_own" on repairs;
create policy "repairs_manage_own"
on repairs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "payment_entries_manage_own" on payment_entries;
create policy "payment_entries_manage_own"
on payment_entries for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "work_orders_manage_own" on work_orders;
create policy "work_orders_manage_own"
on work_orders for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "work_order_updates_manage_own" on work_order_updates;
create policy "work_order_updates_manage_own"
on work_order_updates for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Not:
-- Müşteri takip ekranı için herkese açık erişim gerekiyorsa tabloyu tamamen açan policy yazmayacağız.
-- Bu akış daha sonra server route veya edge function üzerinden, public_tracking_token ile sınırlandırılmış şekilde çözülecek.
