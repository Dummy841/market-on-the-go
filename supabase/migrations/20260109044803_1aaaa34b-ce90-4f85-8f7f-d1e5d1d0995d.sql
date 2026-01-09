-- Credit the existing rejected order that wasn't credited to wallet
-- First, insert or update wallet for user 1b5aa420-f4e2-4cfa-8eb6-ab6ed4aa7b45
INSERT INTO public.user_wallets (user_id, balance)
VALUES ('1b5aa420-f4e2-4cfa-8eb6-ab6ed4aa7b45', 73)
ON CONFLICT (user_id) DO UPDATE SET 
  balance = user_wallets.balance + 73,
  updated_at = now();

-- Create the credit transaction
INSERT INTO public.user_wallet_transactions (user_id, type, amount, description, order_id)
VALUES ('1b5aa420-f4e2-4cfa-8eb6-ab6ed4aa7b45', 'credit', 73, 'Refund for Order #000002', 'DMAR0801000002');

-- Update the order to have a refund_id
UPDATE public.orders
SET refund_id = 'WALLET_' || EXTRACT(EPOCH FROM now())::bigint
WHERE id = 'DMAR0801000002';