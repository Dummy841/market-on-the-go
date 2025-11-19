-- Add latitude and longitude columns to delivery_partners table for real-time tracking
ALTER TABLE delivery_partners 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Enable real-time updates for delivery_partners table
ALTER TABLE delivery_partners REPLICA IDENTITY FULL;

-- Add delivery_partners to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_partners;