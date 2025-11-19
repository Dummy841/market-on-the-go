-- Create delivery partners table
CREATE TABLE public.delivery_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  profile_photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can view all delivery partners" 
ON public.delivery_partners 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can create delivery partners" 
ON public.delivery_partners 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update delivery partners" 
ON public.delivery_partners 
FOR UPDATE 
USING (true);

CREATE POLICY "Admin can delete delivery partners" 
ON public.delivery_partners 
FOR DELETE 
USING (true);

-- Create policies for delivery partners to view their own data
CREATE POLICY "Delivery partners can view their own profile" 
ON public.delivery_partners 
FOR SELECT 
USING (mobile IN (SELECT mobile FROM delivery_partners WHERE id = delivery_partners.id));

CREATE POLICY "Delivery partners can update their own profile" 
ON public.delivery_partners 
FOR UPDATE 
USING (mobile IN (SELECT mobile FROM delivery_partners WHERE id = delivery_partners.id));

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_partners_updated_at
BEFORE UPDATE ON public.delivery_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create delivery partner OTP table
CREATE TABLE public.delivery_partner_otp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on delivery partner OTP
ALTER TABLE public.delivery_partner_otp ENABLE ROW LEVEL SECURITY;

-- Create policy for OTP verification
CREATE POLICY "Allow OTP verification for delivery partners" 
ON public.delivery_partner_otp 
FOR ALL 
USING (true);