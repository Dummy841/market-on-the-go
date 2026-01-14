-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'food_delivery',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view active subcategories" 
ON public.subcategories 
FOR SELECT 
USING (is_active = true);

-- Add subcategory column to sellers table
ALTER TABLE public.sellers ADD COLUMN subcategory TEXT;