-- Create user_notifications table for storing all user notifications
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order_status', 'refund', 'chat', 'promo'
  reference_id TEXT, -- order_id, refund_id, chat_id, etc.
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert notifications" 
ON public.user_notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications FOR UPDATE 
USING (true);

-- Create delivery_customer_chats table
CREATE TABLE public.delivery_customer_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  delivery_partner_id UUID NOT NULL REFERENCES public.delivery_partners(id),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_customer_chats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all access to delivery_customer_chats" 
ON public.delivery_customer_chats FOR ALL 
USING (true);

-- Create delivery_customer_messages table
CREATE TABLE public.delivery_customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.delivery_customer_chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- 'delivery_partner' or 'user'
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_customer_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all access to delivery_customer_messages" 
ON public.delivery_customer_messages FOR ALL 
USING (true);

-- Enable realtime for notifications and chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_customer_messages;