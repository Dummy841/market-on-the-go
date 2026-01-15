-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Create working password functions using pgcrypto
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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