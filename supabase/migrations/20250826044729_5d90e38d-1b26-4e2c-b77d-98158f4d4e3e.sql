-- Add is_active column to items table
ALTER TABLE public.items 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;