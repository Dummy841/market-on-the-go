-- Enable REPLICA IDENTITY FULL for complete row data in real-time updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add orders table to supabase_realtime publication for real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;