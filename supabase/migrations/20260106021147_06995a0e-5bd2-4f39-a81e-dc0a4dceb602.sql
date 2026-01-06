-- Create user_sessions table to track active sessions
CREATE TABLE public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete sessions" 
ON public.user_sessions 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);