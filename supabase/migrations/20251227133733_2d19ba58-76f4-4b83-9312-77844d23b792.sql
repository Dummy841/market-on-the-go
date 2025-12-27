-- Create zippy_pass_subscriptions table to store user subscriptions
CREATE TABLE public.zippy_pass_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  razorpay_payment_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 199,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.zippy_pass_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscriptions" 
ON public.zippy_pass_subscriptions 
FOR SELECT 
USING (user_id IN ( SELECT users.id FROM users WHERE users.id = zippy_pass_subscriptions.user_id ));

CREATE POLICY "Users can create their own subscriptions" 
ON public.zippy_pass_subscriptions 
FOR INSERT 
WITH CHECK (user_id IN ( SELECT users.id FROM users WHERE users.id = zippy_pass_subscriptions.user_id ));

-- Create index for faster lookups
CREATE INDEX idx_zippy_pass_user_active ON public.zippy_pass_subscriptions (user_id, is_active, end_date);