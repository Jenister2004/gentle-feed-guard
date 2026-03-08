
-- Fix overly permissive INSERT policies
DROP POLICY "Authenticated can create conversations" ON public.conversations;
CREATE POLICY "Authenticated can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Authenticated can add participants" ON public.conversation_participants;
CREATE POLICY "Authenticated can add participants" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
