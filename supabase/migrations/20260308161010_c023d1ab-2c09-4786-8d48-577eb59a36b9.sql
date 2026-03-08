
-- Highlights table
CREATE TABLE public.highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Highlight',
  emoji TEXT NOT NULL DEFAULT '⭐',
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Highlight items (photos in a highlight)
CREATE TABLE public.highlight_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  highlight_id UUID NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_items ENABLE ROW LEVEL SECURITY;

-- Highlights policies
CREATE POLICY "Highlights viewable by authenticated" ON public.highlights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own highlights" ON public.highlights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own highlights" ON public.highlights FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON public.highlights FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Highlight items policies
CREATE POLICY "Highlight items viewable by authenticated" ON public.highlight_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add items to own highlights" ON public.highlight_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.highlights WHERE id = highlight_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete items from own highlights" ON public.highlight_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.highlights WHERE id = highlight_id AND user_id = auth.uid())
);

-- Storage bucket for highlight images
INSERT INTO storage.buckets (id, name, public) VALUES ('highlight-images', 'highlight-images', true);

CREATE POLICY "Users can upload highlight images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'highlight-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Highlight images are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'highlight-images');
CREATE POLICY "Users can delete own highlight images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'highlight-images' AND (storage.foldername(name))[1] = auth.uid()::text);
