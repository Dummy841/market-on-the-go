
-- Add missing fields to items table
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS mrp numeric NOT NULL DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS low_stock_alert integer NOT NULL DEFAULT 10;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS gst_percentage numeric NOT NULL DEFAULT 0;
