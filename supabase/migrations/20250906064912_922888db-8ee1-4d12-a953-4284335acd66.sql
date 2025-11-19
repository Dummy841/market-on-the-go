-- Fix OTP expiry duration by updating the existing function
CREATE OR REPLACE FUNCTION public.set_delivery_partner_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at = NEW.created_at + INTERVAL '5 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';