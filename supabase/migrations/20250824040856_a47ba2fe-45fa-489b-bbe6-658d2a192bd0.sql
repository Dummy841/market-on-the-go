-- Create storage bucket for seller profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('seller-profiles', 'seller-profiles', true);

-- Create sellers table
CREATE TABLE public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_photo_url TEXT,
    owner_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Create policies for sellers table
CREATE POLICY "Sellers can view their own data" 
ON public.sellers 
FOR SELECT 
USING (auth.uid()::text = id::text);

CREATE POLICY "Sellers can update their own data" 
ON public.sellers 
FOR UPDATE 
USING (auth.uid()::text = id::text);

-- Admin policies (will need to implement admin role system later)
CREATE POLICY "Allow insert for authenticated users" 
ON public.sellers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all operations for service role" 
ON public.sellers 
FOR ALL 
USING (auth.role() = 'service_role');

-- Storage policies for seller profile photos
CREATE POLICY "Seller profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-profiles');

CREATE POLICY "Users can upload seller profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-profiles');

CREATE POLICY "Users can update seller profile images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-profiles');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_sellers_updated_at()
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
    EXECUTE FUNCTION public.update_sellers_updated_at();