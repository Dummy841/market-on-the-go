-- Create sequence for order numbers (daily reset handled in function)
CREATE SEQUENCE IF NOT EXISTS order_daily_sequence START 1;

-- Function to generate custom order ID
CREATE OR REPLACE FUNCTION public.generate_order_id(seller_name_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    restaurant_code TEXT;
    date_code TEXT;
    sequence_num TEXT;
    current_date_str TEXT;
    last_order_date TEXT;
    next_sequence INTEGER;
BEGIN
    -- Get first 4 alphabetic characters from restaurant name (uppercase)
    restaurant_code := UPPER(REGEXP_REPLACE(seller_name_param, '[^A-Za-z]', '', 'g'));
    restaurant_code := SUBSTRING(restaurant_code FROM 1 FOR 4);
    
    -- Pad with 'X' if less than 4 characters
    WHILE LENGTH(restaurant_code) < 4 LOOP
        restaurant_code := restaurant_code || 'X';
    END LOOP;
    
    -- Get current date in DDMM format
    date_code := TO_CHAR(CURRENT_DATE, 'DDMM');
    current_date_str := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
    
    -- Get the last order's sequence number for today
    SELECT 
        SUBSTRING(id FROM 9 FOR 6),
        TO_CHAR(created_at, 'YYYY-MM-DD')
    INTO sequence_num, last_order_date
    FROM public.orders
    WHERE SUBSTRING(id FROM 5 FOR 4) = date_code
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no orders today or last order was from a different date, start from 1
    IF sequence_num IS NULL OR last_order_date != current_date_str THEN
        next_sequence := 1;
    ELSE
        next_sequence := CAST(sequence_num AS INTEGER) + 1;
    END IF;
    
    -- Format sequence number with leading zeros (6 digits)
    sequence_num := LPAD(next_sequence::TEXT, 6, '0');
    
    -- Combine all parts
    RETURN restaurant_code || date_code || sequence_num;
END;
$$;

-- Create trigger function to set order ID
CREATE OR REPLACE FUNCTION public.set_order_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Generate custom order ID using seller name
    NEW.id := generate_order_id(NEW.seller_name);
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_order_id ON public.orders;

-- Create trigger to automatically set order ID before insert
CREATE TRIGGER trigger_set_order_id
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_id();