-- Add pickup workflow fields to orders table
ALTER TABLE public.orders 
ADD COLUMN pickup_pin TEXT,
ADD COLUMN pickup_status TEXT DEFAULT 'assigned',
ADD COLUMN pickup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN going_for_pickup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN going_for_delivery_at TIMESTAMP WITH TIME ZONE;