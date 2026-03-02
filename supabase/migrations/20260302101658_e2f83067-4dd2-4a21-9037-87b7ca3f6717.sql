
-- Create table for seller UPI IDs
CREATE TABLE public.seller_upi_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  upi_id TEXT NOT NULL,
  label TEXT DEFAULT 'Primary',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_upi_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage their own UPI IDs"
ON public.seller_upi_ids
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure only one default per seller
CREATE OR REPLACE FUNCTION public.ensure_single_default_upi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.seller_upi_ids SET is_default = false WHERE seller_id = NEW.seller_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_single_default_upi
BEFORE INSERT OR UPDATE ON public.seller_upi_ids
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_upi();
