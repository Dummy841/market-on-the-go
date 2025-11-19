-- Fix OTP expiry by setting a shorter duration
-- Update the table constraint to ensure expires_at is set to 10 minutes from creation
CREATE OR REPLACE FUNCTION public.set_delivery_partner_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at = NEW.created_at + INTERVAL '10 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically set expiry
CREATE TRIGGER set_delivery_partner_otp_expiry_trigger
    BEFORE INSERT ON public.delivery_partner_otp
    FOR EACH ROW
    EXECUTE FUNCTION public.set_delivery_partner_otp_expiry();