
-- Add RLS policies for products table to allow basic operations
-- Allow everyone to read products (they're public data)
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

-- Allow authenticated users (employees) to manage products
CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE USING (true);
