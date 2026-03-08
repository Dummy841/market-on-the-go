
CREATE OR REPLACE FUNCTION public.deduct_wholesale_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product_name text;
  v_batch_number text;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    v_product_id := (item->>'product_id')::uuid;
    v_quantity := COALESCE((item->>'quantity')::integer, 0);
    v_product_name := item->>'product_name';
    v_batch_number := item->>'batch_number';

    -- Deduct from wholesale_products
    UPDATE public.wholesale_products
    SET stock_quantity = GREATEST(stock_quantity - v_quantity, 0),
        updated_at = now()
    WHERE id = v_product_id;

    -- If batch_number not in order items, look it up from wholesale_products
    IF v_batch_number IS NULL OR v_batch_number = '' THEN
      SELECT batch_number INTO v_batch_number
      FROM public.wholesale_products
      WHERE id = v_product_id;
    END IF;

    -- Deduct from production_entries
    IF v_batch_number IS NOT NULL AND v_batch_number != '' THEN
      UPDATE public.production_entries
      SET stock_quantity = GREATEST(stock_quantity - v_quantity, 0),
          updated_at = now()
      WHERE item_name = v_product_name
        AND batch_number = v_batch_number;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
