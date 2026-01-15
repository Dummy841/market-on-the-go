-- Add seller location and franchise percentage fields to sellers table
ALTER TABLE public.sellers 
ADD COLUMN seller_latitude NUMERIC,
ADD COLUMN seller_longitude NUMERIC,
ADD COLUMN franchise_percentage NUMERIC DEFAULT 0;