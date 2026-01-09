-- Manually credit yesterday's earnings for all sellers
SELECT public.credit_daily_seller_wallets('2026-01-08'::date);