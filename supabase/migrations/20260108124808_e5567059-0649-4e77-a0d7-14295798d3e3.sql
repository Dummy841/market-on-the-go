-- Create seller_wallets table to track wallet balance
CREATE TABLE public.seller_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id)
);

-- Create seller_wallet_transactions table for transaction history
CREATE TABLE public.seller_wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for seller_wallets
CREATE POLICY "Sellers can view their own wallet" 
ON public.seller_wallets 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert wallets" 
ON public.seller_wallets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update wallets" 
ON public.seller_wallets 
FOR UPDATE 
USING (true);

-- Create policies for seller_wallet_transactions
CREATE POLICY "Sellers can view their own transactions" 
ON public.seller_wallet_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert transactions" 
ON public.seller_wallet_transactions 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_seller_wallets_updated_at
BEFORE UPDATE ON public.seller_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_seller_wallets_seller_id ON public.seller_wallets(seller_id);
CREATE INDEX idx_seller_wallet_transactions_seller_id ON public.seller_wallet_transactions(seller_id);
CREATE INDEX idx_seller_wallet_transactions_created_at ON public.seller_wallet_transactions(created_at DESC);