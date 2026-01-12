-- Enable REPLICA IDENTITY FULL for realtime on support tables
ALTER TABLE public.support_chats REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;