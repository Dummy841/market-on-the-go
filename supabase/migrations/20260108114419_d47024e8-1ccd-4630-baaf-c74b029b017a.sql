-- Add item_info column to items table for seller to add description about the item
ALTER TABLE public.items ADD COLUMN item_info TEXT;