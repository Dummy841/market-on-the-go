-- Add category column to sellers table
ALTER TABLE public.sellers 
ADD COLUMN category text NOT NULL DEFAULT 'food_delivery';

-- Add check constraint for valid categories
ALTER TABLE public.sellers 
ADD CONSTRAINT valid_category CHECK (category IN ('food_delivery', 'instamart', 'dineout', 'services'));