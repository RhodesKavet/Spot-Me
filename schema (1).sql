-- ============================================
-- SPOTME DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  bio text,
  avatar_url text,
  location text,
  gym_id integer,
  followers_count integer default 0,
  following_count integer default 0,
  posts_count integer default 0,
  workouts_count integer default 0,
  points integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

-- POSTS
create table public.posts (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  tag text default 'general',
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

-- POST STATS (embedded workout data)
create table public.post_stats (
  id bigserial primary key,
  post_id bigint references public.posts(id) on delete cascade,
  icon text,
  value text
);

-- LIKES
create table public.likes (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  post_id bigint references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, post_id)
);

-- FOLLOWS
create table public.follows (
  id bigserial primary key,
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(follower_id, following_id)
);

-- GYMS
create table public.gyms (
  id bigserial primary key,
  name text not null,
  address text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  members_count integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

-- GYM MEMBERS (which users check in to which gym)
create table public.gym_members (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  gym_id bigint references public.gyms(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, gym_id)
);

-- WORKOUTS
create table public.workouts (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  type text default 'Strength',
  duration_minutes integer,
  calories integer,
  notes text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- CHALLENGES
create table public.challenges (
  id bigserial primary key,
  title text not null,
  description text,
  icon text default 'ti-flame',
  duration_days integer default 30,
  participants_count integer default 0,
  start_date date default current_date,
  created_at timestamp with time zone default timezone('utc', now())
);

-- CHALLENGE PARTICIPANTS
create table public.challenge_participants (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  challenge_id bigint references public.challenges(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, challenge_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_stats enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_members enable row level security;
alter table public.workouts enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Posts: anyone can read, only owner can write/delete
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);

-- Post stats: public read
create policy "Post stats are viewable by everyone" on public.post_stats for select using (true);
create policy "Users can insert post stats" on public.post_stats for insert with check (true);

-- Likes
create policy "Likes are viewable by everyone" on public.likes for select using (true);
create policy "Users can like posts" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike posts" on public.likes for delete using (auth.uid() = user_id);

-- Follows
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Gyms: public read
create policy "Gyms are viewable by everyone" on public.gyms for select using (true);

-- Gym members
create policy "Gym members are viewable by everyone" on public.gym_members for select using (true);
create policy "Users can join gyms" on public.gym_members for insert with check (auth.uid() = user_id);
create policy "Users can leave gyms" on public.gym_members for delete using (auth.uid() = user_id);

-- Workouts
create policy "Workouts are viewable by everyone" on public.workouts for select using (true);
create policy "Users can log workouts" on public.workouts for insert with check (auth.uid() = user_id);
create policy "Users can delete their workouts" on public.workouts for delete using (auth.uid() = user_id);

-- Challenges
create policy "Challenges are viewable by everyone" on public.challenges for select using (true);
create policy "Challenge participants viewable by everyone" on public.challenge_participants for select using (true);
create policy "Users can join challenges" on public.challenge_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave challenges" on public.challenge_participants for delete using (auth.uid() = user_id);

-- ============================================
-- SEED DATA — Gyms
-- ============================================

insert into public.gyms (name, address, city, country, lat, lng) values
('Iron District Gym', 'Downtown', 'Los Angeles', 'USA', 34.0430, -118.2673),
('Pulse Fitness LA', 'Silver Lake', 'Los Angeles', 'USA', 34.0870, -118.2712),
('The Barbell Club', 'Venice Beach', 'Los Angeles', 'USA', 33.9850, -118.4695),
('Gold Standard Gym', 'Midtown', 'New York City', 'USA', 40.7580, -73.9855),
('CrossFit 5th Ave', 'Midtown', 'New York City', 'USA', 40.7484, -73.9967),
('SweatBox London', 'Shoreditch', 'London', 'UK', 51.5233, -0.0760),
('Athlete Republic', 'Canary Wharf', 'London', 'UK', 51.5054, -0.0235),
('Forge Fitness Tokyo', 'Shibuya', 'Tokyo', 'Japan', 35.6604, 139.6984),
('Peak Performance', 'Downtown', 'Dubai', 'UAE', 25.1972, 55.2744),
('Urban Muscle', 'CBD', 'Sydney', 'Australia', -33.8688, 151.2093),
('Hercules Gym', 'Mitte', 'Berlin', 'Germany', 52.5200, 13.4050),
('The Powerhouse', 'Loop', 'Chicago', 'USA', 41.8781, -87.6298),
('Titan Training', 'South Beach', 'Miami', 'USA', 25.7617, -80.1918),
('FitNation', 'Paulista', 'São Paulo', 'Brazil', -23.5505, -46.6333),
('Strength Co.', 'Downtown', 'Toronto', 'Canada', 43.6532, -79.3832);

-- ============================================
-- SEED DATA — Challenges
-- ============================================

insert into public.challenges (title, description, icon, duration_days, participants_count) values
('30-Day Squat Challenge', 'Progressive squat volume for 30 days straight', 'ti-flame', 30, 1204),
('10K Steps Daily', 'Hit 10,000 steps every single day', 'ti-walk', 30, 876),
('Swim 10K This Month', 'Accumulate 10 kilometers in the pool', 'ti-swim', 30, 312),
('100 Miles on the Bike', 'Ride 100 miles total this month', 'ti-bike', 30, 540);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    split_part(new.email, '@', 1),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
