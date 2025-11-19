-- Add fields to track seller acceptance and delivery partner assignment
ALTER TABLE public.orders 
ADD COLUMN seller_status text DEFAULT 'pending' CHECK (seller_status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN assigned_delivery_partner_id uuid REFERENCES public.delivery_partners(id),
ADD COLUMN assigned_at timestamp with time zone;

-- Create index for better performance
CREATE INDEX idx_orders_seller_status ON public.orders(seller_status);
CREATE INDEX idx_orders_assigned_partner ON public.orders(assigned_delivery_partner_id);