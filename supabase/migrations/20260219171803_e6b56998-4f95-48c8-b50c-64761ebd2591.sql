-- Allow users to update their own comments (needed for soft-delete)
CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id);