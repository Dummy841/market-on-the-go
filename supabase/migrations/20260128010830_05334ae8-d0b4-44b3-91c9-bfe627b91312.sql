-- Add categories column to sellers table for multi-category support
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS categories text;

-- Migrate existing category data to new categories column
UPDATE public.sellers SET categories = category WHERE categories IS NULL;