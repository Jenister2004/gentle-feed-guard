
-- Add is_private column to profiles
ALTER TABLE public.profiles ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Create follow_requests table
CREATE TABLE public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

-- Enable RLS
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Users can see requests they sent or received
CREATE POLICY "Users can view own requests"
  ON public.follow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Users can create follow requests
CREATE POLICY "Users can send requests"
  ON public.follow_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Target user can update (accept/reject) requests sent to them
CREATE POLICY "Target can update requests"
  ON public.follow_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = target_id);

-- Users can delete their own sent requests (cancel) or received requests (reject/cleanup)
CREATE POLICY "Users can delete own requests"
  ON public.follow_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);
