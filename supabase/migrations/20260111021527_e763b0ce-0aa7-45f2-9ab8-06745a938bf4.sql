-- Create support chats table
CREATE TABLE public.support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT,
  user_mobile TEXT,
  order_id TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create support messages table
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for support_chats (open access for now, admin managed)
CREATE POLICY "Anyone can read support chats"
ON public.support_chats
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create support chats"
ON public.support_chats
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update support chats"
ON public.support_chats
FOR UPDATE
USING (true);

-- Create policies for support_messages
CREATE POLICY "Anyone can read support messages"
ON public.support_messages
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at on support_chats
CREATE TRIGGER update_support_chats_updated_at
BEFORE UPDATE ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_support_chats_status ON public.support_chats(status);
CREATE INDEX idx_support_chats_user_id ON public.support_chats(user_id);
CREATE INDEX idx_support_messages_chat_id ON public.support_messages(chat_id);