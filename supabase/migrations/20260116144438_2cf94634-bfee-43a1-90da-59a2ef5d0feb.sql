-- Create a function to delete old notifications (older than 1 day)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_notifications 
  WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run daily at midnight
SELECT cron.schedule(
  'cleanup-notifications-daily',
  '0 0 * * *',
  $$SELECT public.cleanup_old_notifications()$$
);