
-- First, let's check what policies exist and add only the missing ones
-- Add policy for viewing categories (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Anyone can view categories'
    ) THEN
        CREATE POLICY "Anyone can view categories" ON public.categories
        FOR SELECT USING (true);
    END IF;
END $$;

-- Add policy for updating categories (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Authenticated users can update categories'
    ) THEN
        CREATE POLICY "Authenticated users can update categories" ON public.categories
        FOR UPDATE USING (true);
    END IF;
END $$;

-- Add policy for deleting categories (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Authenticated users can delete categories'
    ) THEN
        CREATE POLICY "Authenticated users can delete categories" ON public.categories
        FOR DELETE USING (true);
    END IF;
END $$;
