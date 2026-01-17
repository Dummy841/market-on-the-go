-- Add read_at column to track when messages are read
ALTER TABLE public.delivery_customer_messages 
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on unread messages
CREATE INDEX idx_delivery_customer_messages_read_at 
ON public.delivery_customer_messages(chat_id, read_at) 
WHERE read_at IS NULL;