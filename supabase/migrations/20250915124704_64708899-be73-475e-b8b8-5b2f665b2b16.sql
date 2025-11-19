-- Fix password_hash column type from numeric to text for all tables
ALTER TABLE public.delivery_partners 
ALTER COLUMN password_hash TYPE text USING password_hash::text;

ALTER TABLE public.sellers 
ALTER COLUMN password_hash TYPE text USING password_hash::text;