-- Create items table for sellers
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_photo_url TEXT,
  seller_price DECIMAL(10,2) NOT NULL,
  franchise_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policies for items access
CREATE POLICY "Sellers can view their own items" 
ON public.items 
FOR SELECT 
USING (seller_id IN (SELECT id FROM public.sellers WHERE id = seller_id));

CREATE POLICY "Sellers can create their own items" 
ON public.items 
FOR INSERT 
WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE id = seller_id));

CREATE POLICY "Sellers can update their own items" 
ON public.items 
FOR UPDATE 
USING (seller_id IN (SELECT id FROM public.sellers WHERE id = seller_id));

CREATE POLICY "Sellers can delete their own items" 
ON public.items 
FOR DELETE 
USING (seller_id IN (SELECT id FROM public.sellers WHERE id = seller_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();