-- Fix function search path security warnings by properly dropping dependencies first

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_set_seller_id ON public.sellers;

-- Drop and recreate functions with search_path set
DROP FUNCTION IF EXISTS set_seller_id();
DROP FUNCTION IF EXISTS generate_seller_id();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Recreate generate_seller_id function with search_path set
CREATE OR REPLACE FUNCTION generate_seller_id()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate set_seller_id function with search_path set
CREATE OR REPLACE FUNCTION set_seller_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.seller_id IS NULL THEN
        NEW.seller_id := generate_seller_id();
    END IF;
    RETURN NEW;
END;
$$;

-- Recreate update_updated_at_column function with search_path set
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_set_seller_id
    BEFORE INSERT ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION set_seller_id();