-- Add receipt_url column to seller_wallet_transactions
ALTER TABLE public.seller_wallet_transactions 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create storage bucket for settlement receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('settlement-receipts', 'settlement-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for admin to upload receipts
CREATE POLICY "Anyone can view settlement receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'settlement-receipts');

CREATE POLICY "Admin can upload settlement receipts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'settlement-receipts');

CREATE POLICY "Admin can update settlement receipts"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'settlement-receipts');

CREATE POLICY "Admin can delete settlement receipts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'settlement-receipts');

-- Add UPDATE policy on seller_wallet_transactions for admin
DROP POLICY IF EXISTS "Admin can update transactions" ON public.seller_wallet_transactions;
CREATE POLICY "Admin can update transactions"
ON public.seller_wallet_transactions
FOR UPDATE
USING (true);