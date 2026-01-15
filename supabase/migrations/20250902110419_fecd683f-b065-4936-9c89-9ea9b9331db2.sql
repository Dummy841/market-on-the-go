-- Fix remaining security warnings by updating functions with proper search_path
CREATE OR REPLACE FUNCTION public.generate_seller_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    next_number INTEGER;
    new_seller_id TEXT;
BEGIN
    -- Get the highest existing number from seller_id
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(seller_id FROM 4) AS INTEGER)), 
        0
    ) + 1 
    INTO next_number
    FROM public.sellers 
    WHERE seller_id LIKE 'HMD%';
    
    -- Format the new seller ID with leading zeros
    new_seller_id := 'HMD' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN new_seller_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_seller_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF NEW.seller_id IS NULL THEN
        NEW.seller_id := generate_seller_id();
    END IF;
    RETURN NEW;
END;
$function$;