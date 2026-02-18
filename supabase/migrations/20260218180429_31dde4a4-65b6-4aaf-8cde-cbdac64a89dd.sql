
-- Add gif_url column to comments for GIF support
ALTER TABLE public.comments ADD COLUMN gif_url text;
