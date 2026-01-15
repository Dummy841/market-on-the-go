-- Create sellers table
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_photo_url TEXT,
  owner_name TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Create policies for sellers table
CREATE POLICY "Sellers can view their own data" 
ON public.sellers 
FOR SELECT 
USING (id = (SELECT seller_id FROM (SELECT id as seller_id FROM public.sellers WHERE mobile = current_setting('request.jwt.claims', true)::json->>'mobile') s LIMIT 1));

CREATE POLICY "Only authenticated users can insert sellers" 
ON public.sellers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sellers can update their own data" 
ON public.sellers 
FOR UPDATE 
USING (id = (SELECT seller_id FROM (SELECT id as seller_id FROM public.sellers WHERE mobile = current_setting('request.jwt.claims', true)::json->>'mobile') s LIMIT 1));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for seller profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('seller-profiles', 'seller-profiles', true);

-- Create storage policies for seller profile photos
CREATE POLICY "Anyone can view seller profile photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Anyone can upload seller profile photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Users can update seller profile photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Users can delete seller profile photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-profiles');