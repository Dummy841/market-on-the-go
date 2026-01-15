-- Fix OTP expiry duration to recommended 5 minutes instead of 10 minutes
DROP FUNCTION IF EXISTS public.set_delivery_partner_otp_expiry();

CREATE OR REPLACE FUNCTION public.set_delivery_partner_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at = NEW.created_at + INTERVAL '5 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for delivery partner OTP expiry
DROP TRIGGER IF EXISTS set_delivery_partner_otp_expiry_trigger ON public.delivery_partner_otp;
CREATE TRIGGER set_delivery_partner_otp_expiry_trigger
    BEFORE INSERT ON public.delivery_partner_otp
    FOR EACH ROW
    EXECUTE FUNCTION public.set_delivery_partner_otp_expiry();

-- Also fix user OTP expiry if needed
CREATE OR REPLACE FUNCTION public.set_user_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at = NEW.created_at + INTERVAL '5 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for user OTP expiry
DROP TRIGGER IF EXISTS set_user_otp_expiry_trigger ON public.user_otp;
CREATE TRIGGER set_user_otp_expiry_trigger
    BEFORE INSERT ON public.user_otp
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_otp_expiry();