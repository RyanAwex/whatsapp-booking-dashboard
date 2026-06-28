-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================
-- BUSINESSES
-- =========================
create table if not exists businesses (
id uuid primary key default gen_random_uuid(),

name text not null,
category text not null,

phone text,
address text,

average_customers int,
expected_revenue numeric,

status text not null default 'active',

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- PLANS
-- =========================
create table if not exists plans (
id uuid primary key default gen_random_uuid(),

name text not null unique,
description text,

monthly_price numeric not null,
yearly_price numeric,

max_staff int,
max_services int,
max_clients int,
max_appointments int,

has_whatsapp boolean default false,
has_analytics boolean default false,
has_flow_builder boolean default false,
has_automations boolean default false,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- SUBSCRIPTIONS
-- =========================
create table if not exists subscriptions (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,
plan_id uuid not null references plans(id),

status text not null default 'trial',
billing_cycle text not null default 'monthly',

starts_at timestamp default now(),
ends_at timestamp,
trial_ends_at timestamp,

cancel_at_period_end boolean default false,

payment_provider text,
payment_provider_subscription_id text,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- USERS / PROFILES
-- =========================
create table if not exists users (
id uuid primary key references auth.users(id) on delete cascade,

business_id uuid references businesses(id) on delete set null,

role text check (role in ('owner', 'admin', 'staff')) default 'owner',
name text,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- BUSINESS SETTINGS
-- =========================
create table if not exists business_settings (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,

currency text default 'USD',
timezone text default 'UTC',
booking_page_slug text unique,

booking_approval_mode text default 'automatic'
check (booking_approval_mode in ('automatic', 'manual')),

allow_client_cancel boolean default true,
cancel_limit_hours int default 24,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- STAFF
-- =========================
create table if not exists staff (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,

name text not null,
role text,
description text,

status text not null default 'active'
check (status in ('active', 'inactive')),

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- WORKING HOURS
-- =========================
create table if not exists working_hours (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,
staff_id uuid references staff(id) on delete cascade,

day_of_week int not null check (day_of_week between 0 and 6),
open_time time,
close_time time,
is_closed boolean default false,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- SERVICE CATEGORIES
-- =========================
create table if not exists service_categories (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,

name text not null,
description text,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- SERVICES
-- =========================
create table if not exists services (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,
category_id uuid references service_categories(id) on delete set null,

name text not null,
description text,
duration_minutes int not null,
price numeric not null,

status text not null default 'active'
check (status in ('active', 'inactive')),

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- STAFF SERVICES
-- =========================
create table if not exists staff_services (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,
staff_id uuid not null references staff(id) on delete cascade,
service_id uuid not null references services(id) on delete cascade,

unique (staff_id, service_id)
);

-- =========================
-- CLIENTS
-- =========================
create table if not exists clients (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,

name text not null,
phone text,
email text,

tag text check (tag in ('New', 'VIP', 'Loyal')) default 'New',
notes text,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- APPOINTMENTS
-- =========================
create table if not exists appointments (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,

client_id uuid references clients(id) on delete set null,
service_id uuid references services(id) on delete set null,
staff_id uuid references staff(id) on delete set null,

start_time timestamp not null,
end_time timestamp not null,

status text not null default 'pending'
check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

source text not null default 'dashboard'
check (source in ('dashboard', 'booking_page', 'whatsapp')),

reminder_status text,
notes text,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- SALES
-- =========================
create table if not exists sales (
id uuid primary key default gen_random_uuid(),

business_id uuid not null references businesses(id) on delete cascade,

invoice_number text,
appointment_id uuid references appointments(id) on delete set null,
client_id uuid references clients(id) on delete set null,
service_id uuid references services(id) on delete set null,
staff_id uuid references staff(id) on delete set null,

payment_method text check (payment_method in ('cash', 'card', 'online')),
status text not null default 'pending'
check (status in ('paid', 'pending', 'refunded', 'cancelled')),

amount numeric not null,
paid_at timestamp,

created_at timestamp default now(),
updated_at timestamp default now()
);

-- =========================
-- HELPER FUNCTIONS FOR RLS
-- =========================

create or replace function current_business_id()
returns uuid
language sql
security definer
set search_path = public
as $$
select business_id
from users
where id = auth.uid()
limit 1;

$$
;

create or replace function current_user_role()
returns text
language sql
security definer
set search_path = public
as
$$

select role
from users
where id = auth.uid()
limit 1;

$$
;

-- =========================
-- ENABLE RLS
-- =========================

alter table businesses enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table users enable row level security;
alter table business_settings enable row level security;
alter table staff enable row level security;
alter table working_hours enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table staff_services enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table sales enable row level security;

-- =========================
-- RLS POLICIES
-- =========================

-- -------------------------
-- BUSINESSES POLICIES
-- -------------------------
-- 1. Dashboard: Owner/Admin/Staff can read their own business profile
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'businesses'
    and policyname = 'Users can read own business'
  ) then
    create policy "Users can read own business"
    on businesses
    for select
    using (id = current_business_id());
  end if;
end $$;

-- 2. Dashboard: Only owners and admins can update their business details
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'businesses'
    and policyname = 'Owners and admins can update own business'
  ) then
    create policy "Owners and admins can update own business"
    on businesses
    for update
    using (
      id = current_business_id()
      and current_user_role() in ('owner', 'admin')
    );
  end if;
end $$;

-- 3. Signup: Allow authenticated users to create a business record during registration onboarding
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'businesses'
    and policyname = 'Authenticated users can create businesses'
  ) then
    create policy "Authenticated users can create businesses"
    on businesses
    for insert
    to authenticated
    with check (true);
  end if;
end $$;

-- 4. Booking Page: Allow public/anonymous customers to read active business details (business name, category, status)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'businesses'
    and policyname = 'Public read active businesses'
  ) then
    create policy "Public read active businesses"
    on businesses
    for select
    using (status = 'active');
  end if;
end $$;

-- -------------------------
-- PLANS POLICIES
-- -------------------------
-- 1. General: Anyone (public or logged-in users) can view the subscription plans
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'plans'
    and policyname = 'Anyone can read plans'
  ) then
    create policy "Anyone can read plans"
    on plans
    for select
    using (true);
  end if;
end $$;

-- -------------------------
-- SUBSCRIPTIONS POLICIES
-- -------------------------
-- 1. Dashboard: Business staff can view the active subscription plans
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subscriptions'
    and policyname = 'Users can read own subscription'
  ) then
    create policy "Users can read own subscription"
    on subscriptions
    for select
    using (business_id = current_business_id());
  end if;
end $$;

-- 2. Control Center: Only the business owner can purchase or modify the business subscription plan
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subscriptions'
    and policyname = 'Owners can manage own subscription'
  ) then
    create policy "Owners can manage own subscription"
    on subscriptions
    for all
    using (
      business_id = current_business_id()
      and current_user_role() = 'owner'
    )
    with check (
      business_id = current_business_id()
      and current_user_role() = 'owner'
    );
  end if;
end $$;

-- -------------------------
-- USERS / PROFILES POLICIES
-- -------------------------
-- 1. Auth Signup: Allow users to insert their own profile metadata record on signup
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users'
    and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
    on users
    for insert
    to authenticated
    with check (id = auth.uid());
  end if;
end $$;

-- 2. Dashboard: Allow logged-in business users to read profiles belonging to the same business
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users'
    and policyname = 'Users can read own business users'
  ) then
    create policy "Users can read own business users"
    on users
    for select
    using (
      id = auth.uid()
      or business_id = current_business_id()
    );
  end if;
end $$;

-- 3. Profile Page: Allow users to update their own profile fields
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users'
    and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
    on users
    for update
    using (id = auth.uid())
    with check (id = auth.uid());
  end if;
end $$;

-- -------------------------
-- BUSINESS SETTINGS POLICIES
-- -------------------------
-- 1. Control Center: Allow business staff to manage and edit business settings (timezone, currency, approval mode)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'business_settings'
    and policyname = 'Users can manage own business settings'
  ) then
    create policy "Users can manage own business settings"
    on business_settings
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to read business settings (e.g. resolve page slug, fetch timezone/currency)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'business_settings'
    and policyname = 'Public read business settings'
  ) then
    create policy "Public read business settings"
    on business_settings
    for select
    using (true);
  end if;
end $$;

-- -------------------------
-- STAFF POLICIES
-- -------------------------
-- 1. Control Center: Allow business owners/admins to insert, update, or delete staff records
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'staff'
    and policyname = 'Users can manage own staff'
  ) then
    create policy "Users can manage own staff"
    on staff
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to read active staff names/details to choose a specialist
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'staff'
    and policyname = 'Public read active staff'
  ) then
    create policy "Public read active staff"
    on staff
    for select
    using (status = 'active');
  end if;
end $$;

-- -------------------------
-- WORKING HOURS POLICIES
-- -------------------------
-- 1. Control Center: Allow business users to read or update business-level and staff-level working hours
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'working_hours'
    and policyname = 'Users can manage own working hours'
  ) then
    create policy "Users can manage own working hours"
    on working_hours
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to read working hours to construct and display available slots
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'working_hours'
    and policyname = 'Public read working hours'
  ) then
    create policy "Public read working hours"
    on working_hours
    for select
    using (true);
  end if;
end $$;

-- -------------------------
-- SERVICE CATEGORIES POLICIES
-- -------------------------
-- 1. Services Manager: Allow business users to read/manage categories
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'service_categories'
    and policyname = 'Users can manage own service categories'
  ) then
    create policy "Users can manage own service categories"
    on service_categories
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to view categories to categorize services list
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'service_categories'
    and policyname = 'Public read service categories'
  ) then
    create policy "Public read service categories"
    on service_categories
    for select
    using (true);
  end if;
end $$;

-- -------------------------
-- SERVICES POLICIES
-- -------------------------
-- 1. Services Manager: Allow business users to read/manage services
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'services'
    and policyname = 'Users can manage own services'
  ) then
    create policy "Users can manage own services"
    on services
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to read active services (names, pricing, durations)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'services'
    and policyname = 'Public read active services'
  ) then
    create policy "Public read active services"
    on services
    for select
    using (status = 'active');
  end if;
end $$;

-- -------------------------
-- STAFF SERVICES POLICIES
-- -------------------------
-- 1. Services Manager: Allow business users to map staff to services
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'staff_services'
    and policyname = 'Users can manage own staff services'
  ) then
    create policy "Users can manage own staff services"
    on staff_services
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to read staff service links to list correct specialists
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'staff_services'
    and policyname = 'Public read staff services'
  ) then
    create policy "Public read staff services"
    on staff_services
    for select
    using (true);
  end if;
end $$;

-- -------------------------
-- CLIENTS POLICIES
-- -------------------------
-- 1. Clients Page: Allow business users to manage client profiles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'clients'
    and policyname = 'Users can manage own clients'
  ) then
    create policy "Users can manage own clients"
    on clients
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to insert a client profile when confirming a booking
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'clients'
    and policyname = 'Public insert clients'
  ) then
    create policy "Public insert clients"
    on clients
    for insert
    with check (true);
  end if;
end $$;

-- 3. Booking Page: Allow anonymous customers to read clients (to look up by phone and fetch existing ID)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'clients'
    and policyname = 'Public read clients'
  ) then
    create policy "Public read clients"
    on clients
    for select
    using (true);
  end if;
end $$;

-- -------------------------
-- APPOINTMENTS POLICIES
-- -------------------------
-- 1. Calendar/Dashboard: Allow business users to read/update appointments
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'appointments'
    and policyname = 'Users can manage own appointments'
  ) then
    create policy "Users can manage own appointments"
    on appointments
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- 2. Booking Page: Allow anonymous customers to read appointments (to check conflict slots)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'appointments'
    and policyname = 'Public read appointments'
  ) then
    create policy "Public read appointments"
    on appointments
    for select
    using (true);
  end if;
end $$;

-- 3. Booking Page: Allow anonymous customers to insert new appointments
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'appointments'
    and policyname = 'Public insert appointments'
  ) then
    create policy "Public insert appointments"
    on appointments
    for insert
    with check (true);
  end if;
end $$;

-- -------------------------
-- SALES / TRANSACTIONS POLICIES
-- -------------------------
-- 1. Sales Ledger: Allow business users to record and view transactions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'sales'
    and policyname = 'Users can manage own sales'
  ) then
    create policy "Users can manage own sales"
    on sales
    for all
    using (business_id = current_business_id())
    with check (business_id = current_business_id());
  end if;
end $$;

-- =========================
-- UPDATED_AT AUTO UPDATE
-- =========================

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;

$$
;

drop trigger if exists update_businesses_updated_at on businesses;
create trigger update_businesses_updated_at
before update on businesses
for each row execute function update_updated_at_column();

drop trigger if exists update_plans_updated_at on plans;
create trigger update_plans_updated_at
before update on plans
for each row execute function update_updated_at_column();

drop trigger if exists update_subscriptions_updated_at on subscriptions;
create trigger update_subscriptions_updated_at
before update on subscriptions
for each row execute function update_updated_at_column();

drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at
before update on users
for each row execute function update_updated_at_column();

drop trigger if exists update_business_settings_updated_at on business_settings;
create trigger update_business_settings_updated_at
before update on business_settings
for each row execute function update_updated_at_column();

drop trigger if exists update_staff_updated_at on staff;
create trigger update_staff_updated_at
before update on staff
for each row execute function update_updated_at_column();

drop trigger if exists update_working_hours_updated_at on working_hours;
create trigger update_working_hours_updated_at
before update on working_hours
for each row execute function update_updated_at_column();

drop trigger if exists update_service_categories_updated_at on service_categories;
create trigger update_service_categories_updated_at
before update on service_categories
for each row execute function update_updated_at_column();

drop trigger if exists update_services_updated_at on services;
create trigger update_services_updated_at
before update on services
for each row execute function update_updated_at_column();

drop trigger if exists update_clients_updated_at on clients;
create trigger update_clients_updated_at
before update on clients
for each row execute function update_updated_at_column();

drop trigger if exists update_appointments_updated_at on appointments;
create trigger update_appointments_updated_at
before update on appointments
for each row execute function update_updated_at_column();

drop trigger if exists update_sales_updated_at on sales;
create trigger update_sales_updated_at
before update on sales
for each row execute function update_updated_at_column();

-- ==========================================
-- TRIGGER FOR AUTOMATIC PROFILE CREATION ON SIGNUP
-- ==========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  b_name text;
  b_category text;
  u_name text;
begin
  -- Extract metadata from raw_user_meta_data
  b_name := coalesce(new.raw_user_meta_data->>'business_name', 'My Business');
  b_category := coalesce(new.raw_user_meta_data->>'business_category', 'general');
  u_name := coalesce(new.raw_user_meta_data->>'name', 'Owner');

  -- 1. Insert the business
  insert into public.businesses (name, category, status)
  values (b_name, b_category, 'active')
  returning id into new_business_id;

  -- 2. Insert the user profile connected to the business
  insert into public.users (id, business_id, role, name)
  values (new.id, new_business_id, 'owner', u_name);

  return new;
end;
$$;

-- Trigger to call this function on insert in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================
-- SEED DATA FOR PLANS
-- ==========================================
insert into public.plans (name, description, monthly_price, max_staff, max_services, max_clients, max_appointments, has_whatsapp, has_analytics, has_flow_builder, has_automations)
values 
  ('Free', 'Essential tools for single practitioners starting out.', 0.00, 1, 5, 50, 50, false, false, false, false),
  ('Starter', 'Grow your business with more capacity and CRM tools.', 15.00, 3, 15, 200, 200, false, false, false, false),
  ('Pro', 'Unlock full scheduling automation, WhatsApp tools, and analytics.', 35.00, 999, 999, 9999, 9999, true, true, true, true)
on conflict (name) do nothing;

-- ==========================================
-- TRIGGER TO SYNC STAFF WORKING HOURS WITH BUSINESS HOURS
-- ==========================================
create or replace function public.sync_staff_working_hours()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Trigger fires only when business hours are modified (staff_id is null)
  if NEW.staff_id is null then
    if NEW.is_closed = true then
      -- If business is closed, close all staff availability
      update public.working_hours
      set 
        is_closed = true,
        open_time = null,
        close_time = null
      where business_id = NEW.business_id 
        and day_of_week = NEW.day_of_week 
        and staff_id is not null;
    else
      -- If business is open, cap staff hours to fit within the new business hours bounds
      update public.working_hours
      set 
        open_time = greatest(open_time, NEW.open_time),
        close_time = least(close_time, NEW.close_time),
        is_closed = case 
          when is_closed = true then true
          when greatest(open_time, NEW.open_time) >= least(close_time, NEW.close_time) then true
          else false
        end
      where business_id = NEW.business_id 
        and day_of_week = NEW.day_of_week 
        and staff_id is not null;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_business_hours_updated on public.working_hours;
create trigger on_business_hours_updated
  after insert or update of open_time, close_time, is_closed
  on public.working_hours
  for each row
  execute function public.sync_staff_working_hours();

-- ==========================================
-- TRIGGER TO CLAMP STAFF WORKING HOURS BEFORE SAVE
-- ==========================================
create or replace function public.clamp_staff_working_hours()
returns trigger
language plpgsql
security definer
as $$
declare
  biz_open time;
  biz_close time;
  biz_closed boolean;
begin
  -- If this is a staff-specific working hour row:
  if NEW.staff_id is not null then
    -- Find the corresponding business-level working hours
    select open_time, close_time, is_closed 
    into biz_open, biz_close, biz_closed
    from public.working_hours
    where business_id = NEW.business_id 
      and day_of_week = NEW.day_of_week 
      and staff_id is null
    limit 1;

    if found then
      if biz_closed = true then
        NEW.is_closed := true;
        NEW.open_time := null;
        NEW.close_time := null;
      else
        -- Clamp staff hours to business hours
        if NEW.is_closed = false then
          if NEW.open_time is not null then
            NEW.open_time := greatest(NEW.open_time, biz_open);
          end if;
          if NEW.close_time is not null then
            NEW.close_time := least(NEW.close_time, biz_close);
          end if;
          if NEW.open_time is not null and NEW.close_time is not null and NEW.open_time >= NEW.close_time then
            NEW.is_closed := true;
            NEW.open_time := null;
            NEW.close_time := null;
          end if;
        end if;
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_staff_hours_saving on public.working_hours;
create trigger on_staff_hours_saving
  before insert or update of open_time, close_time, is_closed
  on public.working_hours
  for each row
  execute function public.clamp_staff_working_hours();
-- Schema Migrations:
-- Add default_payment_method to business_settings if it doesn't exist
alter table public.business_settings 
add column if not exists default_payment_method text default 'cash' 
check (default_payment_method in ('cash', 'card', 'online'));

-- Add payment_method to appointments if it doesn't exist
alter table public.appointments 
add column if not exists payment_method text default 'cash' 
check (payment_method in ('cash', 'card', 'online'));

-- Trigger to insert a sale record automatically when an appointment is completed
create or replace function public.auto_create_sale_on_completion()
returns trigger
language plpgsql
security definer
as $$
declare
  service_price numeric;
begin
  if NEW.status = 'completed' then
    -- Check if a sale already exists for this appointment
    if not exists (select 1 from public.sales where appointment_id = NEW.id) then
      -- Get service price
      select price into service_price from public.services where id = NEW.service_id;
      if service_price is null then
        service_price := 0.00;
      end if;

      -- Insert into sales
      insert into public.sales (
        business_id,
        appointment_id,
        client_id,
        service_id,
        staff_id,
        payment_method,
        status,
        amount,
        paid_at
      ) values (
        NEW.business_id,
        NEW.id,
        NEW.client_id,
        NEW.service_id,
        NEW.staff_id,
        coalesce(NEW.payment_method, 'cash'),
        'paid',
        service_price,
        coalesce(NEW.end_time, now())
      );
    end if;
  elsif NEW.status = 'cancelled' then
    -- If cancelled, mark the sale as cancelled
    update public.sales
    set status = 'cancelled'
    where appointment_id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_appointment_status_changed on public.appointments;
create trigger on_appointment_status_changed
  after insert or update of status
  on public.appointments
  for each row
  execute function public.auto_create_sale_on_completion();

-- RPC function to sync past-ended appointments to the sales table automatically
create or replace function public.sync_ended_appointments(p_business_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  r record;
  service_price numeric;
begin
  -- Automatically transition past confirmed appointments to 'completed' status
  update public.appointments
  set status = 'completed'
  where business_id = p_business_id
    and status = 'confirmed'
    and end_time <= now();

  -- Loop through all confirmed/completed appointments in the past that don't have a sale
  for r in 
    select a.id, a.business_id, a.client_id, a.service_id, a.staff_id, a.end_time, a.payment_method
    from public.appointments a
    left join public.sales s on s.appointment_id = a.id
    where a.business_id = p_business_id
      and a.status in ('confirmed', 'completed')
      and a.end_time <= now()
      and s.id is null
  loop
    -- Get price
    select price into service_price from public.services where id = r.service_id;
    if service_price is null then
      service_price := 0.00;
    end if;

    -- Insert sale
    insert into public.sales (
      business_id,
      appointment_id,
      client_id,
      service_id,
      staff_id,
      payment_method,
      status,
      amount,
      paid_at,
      created_at
    ) values (
      r.business_id,
      r.id,
      r.client_id,
      r.service_id,
      r.staff_id,
      coalesce(r.payment_method, 'cash'),
      'paid',
      r.end_time,
      r.end_time
    );
  end loop;
end;
$$;

-- Trigger function to keep sales table payment method in sync with appointments table updates
create or replace function public.sync_payment_method_to_sales()
returns trigger
language plpgsql
security definer
as $$
begin
  if OLD.payment_method is distinct from NEW.payment_method then
    update public.sales
    set payment_method = NEW.payment_method
    where appointment_id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_appointment_payment_method_changed on public.appointments;
create trigger on_appointment_payment_method_changed
  after update of payment_method
  on public.appointments
  for each row
  execute function public.sync_payment_method_to_sales();

