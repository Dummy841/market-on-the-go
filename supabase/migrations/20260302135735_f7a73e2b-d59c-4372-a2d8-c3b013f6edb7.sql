
-- Create seller_sessions table for device management
CREATE TABLE public.seller_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web', -- 'app' or 'web'
  device_info text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all access to seller_sessions"
ON public.seller_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_seller_sessions_seller_id ON public.seller_sessions(seller_id);
CREATE INDEX idx_seller_sessions_token ON public.seller_sessions(session_token);
