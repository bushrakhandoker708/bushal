-- supabase/migrations/001_products.sql

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price > 0),
  image_url text,
  in_stock boolean not null default true,
  discount_percent integer check (discount_percent >= 0 and discount_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.handle_updated_at();

alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products for select
  using (true);