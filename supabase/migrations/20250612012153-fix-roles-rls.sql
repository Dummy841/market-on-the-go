
-- Update RLS policies for roles table to work with current auth system
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON public.roles;

-- Create more permissive policies for the current setup
CREATE POLICY "Allow all operations on roles" 
  ON public.roles 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
