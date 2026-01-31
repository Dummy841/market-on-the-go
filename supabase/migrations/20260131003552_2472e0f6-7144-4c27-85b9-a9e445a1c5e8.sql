-- Add subcategory_id column to items table
ALTER TABLE public.items ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id);

-- Create index for faster queries
CREATE INDEX idx_items_subcategory_id ON public.items(subcategory_id);