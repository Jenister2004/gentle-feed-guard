
-- Fix: restrict flagged_content insert to the user's own content being flagged
DROP POLICY "System can insert flagged content" ON public.flagged_content;
CREATE POLICY "Users can insert own flagged content" ON public.flagged_content FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
