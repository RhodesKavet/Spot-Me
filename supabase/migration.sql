-- =================================================================
-- SpotMe Migration — run this in the Supabase SQL Editor
-- Adds media support + indexes. Safe to run multiple times.
-- =================================================================

-- 1. Add media columns to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- 2. Constrain media_type values
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_media_type_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_media_type_check
  CHECK (media_type IN ('text', 'image', 'video'));

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS posts_user_id_idx     ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx  ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS likes_post_id_idx     ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS likes_user_post_idx   ON public.likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS follows_follower_idx  ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx  ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS saves_user_post_idx   ON public.saves(user_id, post_id);

-- =================================================================
-- Supabase Storage Setup (do this in the Supabase Dashboard UI):
--
-- 1. Storage → New Bucket → Name: "avatars"
--    ✅ Public bucket
--
-- 2. Storage → New Bucket → Name: "posts"
--    ✅ Public bucket
--
-- 3. After creating buckets, add these policies via SQL Editor:
-- =================================================================

-- Storage RLS for avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY IF NOT EXISTS "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Post media is publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

-- =================================================================
-- DONE — your SpotMe database is fully set up!
-- =================================================================
