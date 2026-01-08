-- Add is_bank_verified column to sellers table
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS is_bank_verified BOOLEAN NOT NULL DEFAULT false;