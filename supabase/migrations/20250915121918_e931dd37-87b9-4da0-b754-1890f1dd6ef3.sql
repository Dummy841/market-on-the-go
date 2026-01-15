-- Fix search path for password functions
DROP FUNCTION IF EXISTS public.hash_password(TEXT);
DROP FUNCTION IF EXISTS public.verify_password(TEXT, TEXT);

-- Create function to hash passwords with proper search path
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

-- Create function to verify passwords with proper search path
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN crypt(password, hash) = hash;
END;
$$;