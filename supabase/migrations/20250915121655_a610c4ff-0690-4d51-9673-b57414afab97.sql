-- Add password_hash column to delivery_partners table
ALTER TABLE public.delivery_partners 
ADD COLUMN password_hash TEXT;

-- Create function to hash passwords (using PostgreSQL's built-in crypt function)
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN crypt(password, hash) = hash;
END;
$$;