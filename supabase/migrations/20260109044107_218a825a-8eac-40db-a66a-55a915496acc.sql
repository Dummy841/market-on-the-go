-- Wallet tables are used with the app's custom auth (not Supabase auth), so RLS blocks reads/writes.
-- Disable RLS to allow wallet balance display and wallet credit/debit operations.

ALTER TABLE public.user_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallet_transactions DISABLE ROW LEVEL SECURITY;

-- Optional: keep tables tidy if policies existed
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_wallets','user_wallet_transactions')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;