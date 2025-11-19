-- Fix the search path security issues for password functions
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Handle case where hash might be plain text (for existing data)
    IF hash = password THEN
        RETURN true;
    END IF;
    -- Normal bcrypt verification
    RETURN crypt(password, hash) = hash;
END;
$$;