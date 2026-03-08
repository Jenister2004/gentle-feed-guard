
-- YouTube videos table
CREATE TABLE public.youtube_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  video_url text NOT NULL,
  thumbnail_url text,
  video_type text NOT NULL DEFAULT 'upload', -- 'upload' or 'youtube'
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos viewable by authenticated" ON public.youtube_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create videos" ON public.youtube_videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON public.youtube_videos FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update videos" ON public.youtube_videos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- YouTube comments table
CREATE TABLE public.youtube_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated" ON public.youtube_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.youtube_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.youtube_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.youtube_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update comments" ON public.youtube_comments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- YouTube likes table
CREATE TABLE public.youtube_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

ALTER TABLE public.youtube_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by authenticated" ON public.youtube_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.youtube_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.youtube_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for youtube videos
INSERT INTO storage.buckets (id, name, public) VALUES ('youtube-videos', 'youtube-videos', true);

-- Storage policies
CREATE POLICY "Authenticated can upload youtube videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'youtube-videos');
CREATE POLICY "Public can view youtube videos" ON storage.objects FOR SELECT USING (bucket_id = 'youtube-videos');
CREATE POLICY "Users can delete own youtube videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'youtube-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
