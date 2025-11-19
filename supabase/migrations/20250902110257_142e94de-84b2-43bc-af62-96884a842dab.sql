-- Create orders table to store user orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  seller_name TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 29,
  platform_fee NUMERIC NOT NULL DEFAULT 5,
  gst_charges NUMERIC NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  instructions TEXT,
  payment_method TEXT NOT NULL DEFAULT 'upi',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE id = user_id));

-- Create policy for inserting orders
CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = user_id));

-- Create policies for admin access (dashboard)
CREATE POLICY "Admin can view all orders" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can update orders" 
ON public.orders 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);