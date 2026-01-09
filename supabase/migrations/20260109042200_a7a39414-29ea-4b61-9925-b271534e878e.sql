-- Add refund_id column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_id TEXT;