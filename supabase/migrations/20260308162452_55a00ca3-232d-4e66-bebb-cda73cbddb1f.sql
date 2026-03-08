
CREATE OR REPLACE FUNCTION public.deduct_order_item_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item jsonb;
  v_item_id uuid;
  v_quantity integer;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    v_item_id := (item->>'id')::uuid;
    v_quantity := COALESCE((item->>'quantity')::integer, 0);

    UPDATE public.items
    SET stock_quantity = GREATEST(stock_quantity - v_quantity, 0),
        updated_at = now()
    WHERE id = v_item_id;
  END LOOP;

  RETURN NEW;
END;
$$;
