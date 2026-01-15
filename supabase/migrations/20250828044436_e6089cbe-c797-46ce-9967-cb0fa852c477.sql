-- Add is_online column to sellers table to track online/offline status
ALTER TABLE public.sellers 
ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT true;