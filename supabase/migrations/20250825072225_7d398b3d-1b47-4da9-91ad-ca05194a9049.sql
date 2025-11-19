-- Add seller_id column with unique constraint
ALTER TABLE public.sellers 
ADD COLUMN seller_id TEXT UNIQUE;

-- Create a function to generate the next seller ID
CREATE OR REPLACE FUNCTION generate_seller_id()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set seller_id on insert
CREATE OR REPLACE FUNCTION set_seller_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.seller_id IS NULL THEN
        NEW.seller_id := generate_seller_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for seller_id generation
CREATE TRIGGER trigger_set_seller_id
    BEFORE INSERT ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION set_seller_id();

-- Update existing sellers to have seller_id if they don't have one
UPDATE public.sellers 
SET seller_id = generate_seller_id()
WHERE seller_id IS NULL;