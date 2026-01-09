-- Create User Wallets table
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create User Wallet Transactions table  
CREATE TABLE public.user_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_user_wallet_transactions_user_id ON public.user_wallet_transactions(user_id);
CREATE INDEX idx_user_wallet_transactions_created_at ON public.user_wallet_transactions(created_at DESC);

-- Enable RLS on user_wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wallets
CREATE POLICY "Users can view their own wallet"
ON public.user_wallets FOR SELECT
USING (user_id IN (SELECT id FROM public.users WHERE id = user_wallets.user_id));

CREATE POLICY "System can insert wallets"
ON public.user_wallets FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update wallets"
ON public.user_wallets FOR UPDATE
USING (true);

-- Enable RLS on user_wallet_transactions
ALTER TABLE public.user_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wallet_transactions
CREATE POLICY "Users can view their own transactions"
ON public.user_wallet_transactions FOR SELECT
USING (user_id IN (SELECT id FROM public.users WHERE id = user_wallet_transactions.user_id));

CREATE POLICY "System can insert transactions"
ON public.user_wallet_transactions FOR INSERT
WITH CHECK (true);

-- Create trigger for updating updated_at on user_wallets
CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();