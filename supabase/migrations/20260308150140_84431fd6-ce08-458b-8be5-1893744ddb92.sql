
-- Story likes table
CREATE TABLE public.story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story likes viewable by authenticated"
  ON public.story_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like stories"
  ON public.story_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike stories"
  ON public.story_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Story views table
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owner can see views"
  ON public.story_views FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()
    )
    OR auth.uid() = viewer_id
  );

CREATE POLICY "Users can record views"
  ON public.story_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id);
