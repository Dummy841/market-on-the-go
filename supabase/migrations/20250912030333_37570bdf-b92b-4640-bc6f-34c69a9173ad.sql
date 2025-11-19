-- Add delivery_pin column to orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_pin text;

-- Create function to generate delivery PIN
CREATE OR REPLACE FUNCTION public.generate_delivery_pin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN LPAD(floor(random() * 10000)::text, 4, '0');
END;
$$;

-- Create trigger to generate delivery PIN when order status becomes 'out_for_delivery'
CREATE OR REPLACE FUNCTION public.set_delivery_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Generate delivery PIN when status changes to 'out_for_delivery'
    IF NEW.status = 'out_for_delivery' AND (OLD.status IS NULL OR OLD.status != 'out_for_delivery') THEN
        NEW.delivery_pin = generate_delivery_pin();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for delivery PIN generation
CREATE TRIGGER trigger_set_delivery_pin
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_delivery_pin();