-- Helper function to avoid recursive RLS lookups on conversation_participants
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Recreate policies using security definer helper
DROP POLICY IF EXISTS "Participants can view participants" ON public.conversation_participants;
CREATE POLICY "Participants can view participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
CREATE POLICY "Participants can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));