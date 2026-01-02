-- Create banners table for home screen banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies - banners are publicly readable, but only admin can modify
CREATE POLICY "Anyone can view active banners" 
ON public.banners 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage banners" 
ON public.banners 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default welcome banner
INSERT INTO public.banners (title, subtitle, display_order, is_active)
VALUES ('Welcome to Zippy', 'Fast delivery at your doorstep', 0, true);