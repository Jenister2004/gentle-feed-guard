
-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Stories viewable by authenticated"
ON public.stories FOR SELECT
USING (true);

CREATE POLICY "Users can create own stories"
ON public.stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
ON public.stories FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update stories"
ON public.stories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for story images
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Story images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-images');

CREATE POLICY "Users can upload story images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own story images"
ON storage.objects FOR DELETE
USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);
