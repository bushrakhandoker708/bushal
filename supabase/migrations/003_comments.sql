-- supabase/migrations/003_comments.sql

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  rating integer check (rating >= 1 and rating <= 5),
  admin_reply text,
  created_at timestamptz not null default now()
);

create unique index if not exists comments_user_product_unique
  on public.comments(user_id, product_id);

alter table public.comments enable row level security;

create policy "Comments are publicly readable"
  on public.comments for select
  using (true);

create policy "Users can insert own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);