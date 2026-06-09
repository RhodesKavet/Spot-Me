export interface Profile {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  location: string | null
  gym_id: number | null
  followers_count: number
  following_count: number
  posts_count: number
  workouts_count: number
  points: number
  created_at: string
}

export interface Post {
  id: number
  user_id: string
  body: string
  tag: string
  media_url: string | null
  media_type: 'text' | 'image' | 'video' | null
  likes_count: number
  comments_count: number
  save_count: number
  created_at: string
  profiles?: Profile
}

export interface Comment {
  id: number
  post_id: number
  user_id: string
  body: string
  created_at: string
  profiles?: Profile
}

export interface Save {
  id: number
  user_id: string
  post_id: number
  created_at: string
}

export interface Follow {
  id: number
  follower_id: string
  following_id: string
  created_at: string
}

export interface Gym {
  id: number
  name: string
  address: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  members_count: number
  created_at: string
}

export const WORKOUT_TAGS = [
  'Chest', 'Back', 'Legs', 'Shoulders',
  'Arms', 'Core', 'Cardio', 'Full Body', 'General',
]

export const TAG_GRADIENTS: Record<string, string> = {
  chest:     'from-red-900/80 via-bg-1/60 to-bg-1',
  back:      'from-blue-900/80 via-bg-1/60 to-bg-1',
  legs:      'from-green-900/80 via-bg-1/60 to-bg-1',
  shoulders: 'from-yellow-900/80 via-bg-1/60 to-bg-1',
  arms:      'from-orange-900/80 via-bg-1/60 to-bg-1',
  core:      'from-teal-900/80 via-bg-1/60 to-bg-1',
  cardio:    'from-purple-900/80 via-bg-1/60 to-bg-1',
  'full body':'from-pink-900/80 via-bg-1/60 to-bg-1',
  general:   'from-bg-5/90 via-bg-1/60 to-bg-1',
}
