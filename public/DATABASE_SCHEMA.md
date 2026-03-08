# Database Schema — Gentle Feed Guard

## Tables

### 1. profiles
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| username | text | No | — |
| full_name | text | No | '' |
| avatar_url | text | Yes | NULL |
| bio | text | Yes | '' |
| is_suspended | boolean | No | false |
| is_banned | boolean | No | false |
| warning_count | integer | No | 0 |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

### 2. posts
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| image_url | text | No | — |
| caption | text | Yes | '' |
| is_flagged | boolean | No | false |
| flag_reason | text | Yes | NULL |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

### 3. comments
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| post_id | uuid | No | — (FK → posts.id) |
| user_id | uuid | No | — |
| content | text | No | — |
| gif_url | text | Yes | NULL |
| is_flagged | boolean | No | false |
| flag_reason | text | Yes | NULL |
| is_deleted | boolean | No | false |
| created_at | timestamptz | No | now() |

### 4. likes
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| post_id | uuid | No | — (FK → posts.id) |
| user_id | uuid | No | — |
| created_at | timestamptz | No | now() |

### 5. follows
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| follower_id | uuid | No | — |
| following_id | uuid | No | — |
| created_at | timestamptz | No | now() |

### 6. stories
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| image_url | text | No | — |
| caption | text | Yes | '' |
| is_flagged | boolean | No | false |
| flag_reason | text | Yes | NULL |
| created_at | timestamptz | No | now() |
| expires_at | timestamptz | No | now() + 24h |

### 7. flagged_content
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| content_type | text | No | — |
| content_id | uuid | Yes | NULL |
| user_id | uuid | No | — |
| reason | text | No | — |
| original_content | text | Yes | NULL |
| action_taken | text | Yes | 'auto_deleted' |
| reviewed | boolean | No | false |
| created_at | timestamptz | No | now() |

### 8. user_roles
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| role | app_role enum | No | 'user' |

## Enums

- **app_role**: `admin` | `moderator` | `user`

## Key Functions

- `has_role(_user_id uuid, _role app_role) → boolean` — Security definer function to check user roles without RLS recursion.

## GIF Dataset (in-app, not in DB)

The app includes 36 embedded GIFs in `src/components/feed/GifPicker.tsx`:
- **12 safe/positive GIFs**: Thumbs Up, Clapping, Heart, Laughing, High Five, Dancing, Cool, Peace, Celebration, Love It, Wow, Thank You
- **24 flagged cyberbullying GIFs**: Mocking, Mean Look, Loser Sign, Body Shame, Ugly Insult, Racial Mock, Color Shame, Fat Shame, Bully Push, Skinny Shame, Hate Speech, Go Away, Eye Roll, Shut Up, Cringe, Laughing At, Pointing, Disgust, Dismissive, You Suck, Toxic
