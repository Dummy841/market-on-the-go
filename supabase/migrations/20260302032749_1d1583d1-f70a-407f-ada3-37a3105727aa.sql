-- Set delivery_pin for existing orders that don't have one
UPDATE public.wholesale_orders SET delivery_pin = LPAD(floor(random() * 10000)::text, 4, '0') WHERE delivery_pin IS NULL;

-- Create trigger to auto-generate delivery_pin on insert
CREATE OR REPLACE FUNCTION public.set_wholesale_delivery_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.delivery_pin IS NULL OR NEW.delivery_pin = '' THEN
    NEW.delivery_pin := LPAD(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_wholesale_order_delivery_pin
BEFORE INSERT ON public.wholesale_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_wholesale_delivery_pin();