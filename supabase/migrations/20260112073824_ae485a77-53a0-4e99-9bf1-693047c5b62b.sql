-- Create service_modules table
CREATE TABLE public.service_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  image_url TEXT,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_modules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active modules"
ON public.service_modules
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admin can manage modules"
ON public.service_modules
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default modules
INSERT INTO public.service_modules (title, subtitle, badge, slug, display_order) VALUES
('FOOD DELIVERY', 'YESVEMBER: LIVE NOW', 'GET 65% OFF', 'food_delivery', 1),
('INSTAMART', 'GROCERY DELIVERY', 'FREE ₹125', 'instamart', 2),
('DAIRY PRODUCTS', 'FRESH DAILY', 'UP TO 50% OFF', 'dairy', 3),
('SERVICES', 'OTHERS', 'GET SERVICES IN MINS', 'services', 4);

-- Create trigger for automatic timestamp updates (if not exists)
CREATE OR REPLACE FUNCTION public.update_service_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_service_modules_updated_at
BEFORE UPDATE ON public.service_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_service_modules_updated_at();