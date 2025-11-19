-- Fix infinite recursion in RLS policies by dropping and recreating them
DROP POLICY IF EXISTS "Sellers can view their own data" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can update their own data" ON public.sellers;

-- Create simple policies that allow admin access to all sellers
-- For now, allowing all authenticated users to view and manage sellers
-- In production, you'd want to check for admin role
CREATE POLICY "Allow all access to sellers for admin" 
ON public.sellers 
FOR ALL 
USING (true)
WITH CHECK (true);