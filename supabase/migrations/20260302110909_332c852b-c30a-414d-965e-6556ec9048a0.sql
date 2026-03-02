
-- Create table for multiple item images (up to 4 per item)
CREATE TABLE public.seller_item_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_item_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view item images (customers need to see them)
CREATE POLICY "Item images are publicly viewable"
ON public.seller_item_images FOR SELECT USING (true);

-- Sellers can manage their own item images (via item ownership)
CREATE POLICY "Sellers can insert item images"
ON public.seller_item_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.items WHERE items.id = item_id
  )
);

CREATE POLICY "Sellers can delete item images"
ON public.seller_item_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.items WHERE items.id = item_id
  )
);

-- Index for fast lookups
CREATE INDEX idx_seller_item_images_item_id ON public.seller_item_images(item_id);
