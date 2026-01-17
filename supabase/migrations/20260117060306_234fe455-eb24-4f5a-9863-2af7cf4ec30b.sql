-- Create voice_calls table for in-app calling
CREATE TABLE public.voice_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.delivery_customer_chats(id) ON DELETE CASCADE,
  caller_type TEXT NOT NULL CHECK (caller_type IN ('user', 'delivery_partner')),
  caller_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'ongoing', 'ended', 'declined', 'missed')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_voice_calls_chat_id ON public.voice_calls(chat_id);
CREATE INDEX idx_voice_calls_status ON public.voice_calls(status);

-- RLS Policies - Allow all operations for now (no auth.uid() since we use custom auth)
CREATE POLICY "Allow all voice_calls operations"
ON public.voice_calls
FOR ALL
USING (true)
WITH CHECK (true);

-- Add to realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls;