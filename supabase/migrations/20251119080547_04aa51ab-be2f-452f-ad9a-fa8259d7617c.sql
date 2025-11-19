-- Change the id column types from UUID to TEXT for custom order IDs

-- Step 1: Drop foreign key constraint from ratings table
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_order_id_fkey;

-- Step 2: Change orders.id column type from UUID to TEXT
ALTER TABLE public.orders ALTER COLUMN id SET DATA TYPE TEXT;

-- Step 3: Change ratings.order_id column type from UUID to TEXT
ALTER TABLE public.ratings ALTER COLUMN order_id SET DATA TYPE TEXT;

-- Step 4: Recreate the foreign key constraint
ALTER TABLE public.ratings ADD CONSTRAINT ratings_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id);

-- Step 5: Update the trigger function to work with TEXT id
DROP TRIGGER IF EXISTS trigger_set_order_id ON public.orders;
DROP FUNCTION IF EXISTS public.set_order_id();

-- Step 6: Recreate the trigger function
CREATE OR REPLACE FUNCTION public.set_order_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only generate custom order ID if id is not already set or is empty
    IF NEW.id IS NULL OR NEW.id = '' OR NEW.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        NEW.id := generate_order_id(NEW.seller_name);
    END IF;
    RETURN NEW;
END;
$$;

-- Step 7: Recreate trigger
CREATE TRIGGER trigger_set_order_id
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_id();