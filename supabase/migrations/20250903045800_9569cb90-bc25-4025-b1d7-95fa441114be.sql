-- Update orders table to add more detailed status tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_packed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Update the status column to include more specific statuses
-- pending -> seller_accepted -> preparing -> packed -> out_for_delivery -> delivered -> rejected

-- Create RLS policy for sellers to view and update their orders
CREATE POLICY "Sellers can view their orders" 
ON public.orders 
FOR SELECT 
USING (seller_id IN (SELECT id FROM sellers));

CREATE POLICY "Sellers can update their orders" 
ON public.orders 
FOR UPDATE 
USING (seller_id IN (SELECT id FROM sellers));