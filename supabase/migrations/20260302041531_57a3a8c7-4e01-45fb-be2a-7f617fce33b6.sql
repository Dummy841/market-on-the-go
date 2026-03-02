
-- Add missing fields to items table to match wholesale product modal
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS barcode text DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS purchase_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS show_in_quick_add boolean NOT NULL DEFAULT false;
