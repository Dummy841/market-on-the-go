-- Add delivery_mobile field to orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_mobile text;