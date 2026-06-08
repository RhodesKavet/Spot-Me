-- ============================================
-- SPOTME SCHEMA V2 — run in Supabase SQL Editor
-- Adds: saves, comments tables + RLS
-- ============================================

create table if not exists public.saves (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  post_id bigint references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, post_id)
);
alter table public.saves enable row level security;
create policy "Users can view own saves" on public.saves for select using (auth.uid() = user_id);
create policy "Users can save posts" on public.saves for insert with check (auth.uid() = user_id);
create policy "Users can unsave posts" on public.saves for delete using (auth.uid() = user_id);

create table if not exists public.comments (
  id bigserial primary key,
  post_id bigint references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone default timezone('utc', now())
);
alter table public.comments enable row level security;
create policy "Comments viewable by everyone" on public.comments for select using (true);
create policy "Users can add comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- add save_count to posts for display
alter table public.posts add column if not exists save_count integer default 0;
