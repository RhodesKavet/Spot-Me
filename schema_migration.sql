-- ============================================
-- SPOTME SCHEMA MIGRATION
-- Run this in Supabase SQL Editor AFTER the base schema
-- (or re-run everything using schema_v2.sql below)
-- ============================================

-- Add missing columns to profiles
alter table public.profiles add column if not exists gym_name text;

-- Add missing columns to posts
alter table public.posts add column if not exists bravo_count integer default 0;
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;
-- body can now be empty (for media-only posts)
alter table public.posts alter column body set default '';
alter table public.posts alter column body drop not null;

-- Add missing RLS: anyone authenticated can update bravo_count on any post
create policy if not exists "Authenticated users can update posts" on public.posts
  for update using (auth.role() = 'authenticated');

-- ============================================
-- FULL SCHEMA V2 — safe to run from scratch
-- Drop and recreate everything cleanly
-- ============================================
