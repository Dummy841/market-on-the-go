
-- Backfill existing items with S10001, S10002, ... barcodes based on created_at order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.items
  WHERE barcode IS NULL OR barcode = ''
)
UPDATE public.items
SET barcode = 'S' || LPAD((10000 + numbered.rn)::text, 5, '0')
FROM numbered
WHERE items.id = numbered.id;

-- Create a function to generate the next seller item barcode
CREATE OR REPLACE FUNCTION public.generate_seller_item_barcode()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(barcode FROM 2) AS INTEGER)), 10000)
  INTO max_num
  FROM public.items
  WHERE barcode LIKE 'S%' AND SUBSTRING(barcode FROM 2) ~ '^\d+$';
  
  RETURN 'S' || LPAD((max_num + 1)::text, 5, '0');
END;
$$;
