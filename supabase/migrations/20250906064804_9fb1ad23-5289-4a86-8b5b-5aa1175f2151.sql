-- Add location coordinates to orders table for exact delivery locations
ALTER TABLE public.orders 
ADD COLUMN delivery_latitude NUMERIC,
ADD COLUMN delivery_longitude NUMERIC;

-- Add seller_status column to properly track seller actions separately from overall status
ALTER TABLE public.orders 
ADD COLUMN seller_status TEXT DEFAULT 'pending';

-- Update existing orders to have seller_status based on current status
UPDATE public.orders 
SET seller_status = 
  CASE 
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'assigned' OR status = 'out_for_delivery' OR status = 'delivered' THEN 'packed'
    ELSE 'pending'
  END;

-- Add index for better performance on location queries
CREATE INDEX idx_orders_location ON public.orders(delivery_latitude, delivery_longitude) WHERE delivery_latitude IS NOT NULL AND delivery_longitude IS NOT NULL;