
-- Add category column to the existing roles table
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS category text;

-- Enable Row Level Security on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create policies for roles table
CREATE POLICY "Anyone can view roles" 
  ON public.roles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert roles" 
  ON public.roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update roles" 
  ON public.roles 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete roles" 
  ON public.roles 
  FOR DELETE 
  TO authenticated
  USING (true);
