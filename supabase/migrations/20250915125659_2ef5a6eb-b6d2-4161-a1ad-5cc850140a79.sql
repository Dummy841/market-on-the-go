-- Create user addresses table
CREATE TABLE public.user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Other',
  house_number TEXT NOT NULL,
  apartment_area TEXT,
  directions TEXT,
  full_address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies for user addresses
CREATE POLICY "Users can view their own addresses" 
ON public.user_addresses 
FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE id = user_addresses.user_id));

CREATE POLICY "Users can create their own addresses" 
ON public.user_addresses 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE id = user_addresses.user_id));

CREATE POLICY "Users can update their own addresses" 
ON public.user_addresses 
FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE id = user_addresses.user_id));

CREATE POLICY "Users can delete their own addresses" 
ON public.user_addresses 
FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE id = user_addresses.user_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_addresses_updated_at
BEFORE UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();