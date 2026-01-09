-- Track idempotent daily wallet credits per seller
CREATE TABLE IF NOT EXISTS public.seller_daily_wallet_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  credit_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, credit_date)
);

ALTER TABLE public.seller_daily_wallet_credits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seller_daily_wallet_credits'
      AND policyname = 'System can manage daily wallet credits'
  ) THEN
    CREATE POLICY "System can manage daily wallet credits"
    ON public.seller_daily_wallet_credits
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Compute seller net earnings for a given local (Asia/Kolkata) date
CREATE OR REPLACE FUNCTION public.compute_seller_daily_net_earnings(
  p_seller_id uuid,
  p_date date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_franchise_pct numeric := 0;
  v_delivered_items_total numeric := 0;
  v_delivered_net numeric := 0;
  v_rejected_count int := 0;
  v_penalty numeric := 0;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  SELECT COALESCE(franchise_percentage, 0)
  INTO v_franchise_pct
  FROM public.sellers
  WHERE id = p_seller_id;

  -- Interpret p_date as Asia/Kolkata day boundaries
  v_day_start := (p_date::timestamp AT TIME ZONE 'Asia/Kolkata');
  v_day_end := ((p_date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata');

  -- Sum seller_price * quantity for delivered orders
  SELECT COALESCE(
    SUM(
      COALESCE((itm->>'seller_price')::numeric, 0) *
      COALESCE(NULLIF((itm->>'quantity')::numeric, 0), 1)
    ),
    0
  )
  INTO v_delivered_items_total
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS itm
  WHERE o.seller_id = p_seller_id
    AND o.status = 'delivered'
    AND o.created_at >= v_day_start
    AND o.created_at < v_day_end;

  v_delivered_net := v_delivered_items_total * (1 - (v_franchise_pct / 100));

  -- Penalty for rejected/refunded orders
  SELECT COUNT(*)
  INTO v_rejected_count
  FROM public.orders o
  WHERE o.seller_id = p_seller_id
    AND o.status IN ('rejected', 'refunded')
    AND o.created_at >= v_day_start
    AND o.created_at < v_day_end;

  v_penalty := v_rejected_count * 10;

  RETURN COALESCE(v_delivered_net, 0) - COALESCE(v_penalty, 0);
END;
$$;

-- Credit daily earnings to seller wallets at 11:59 PM (IST)
CREATE OR REPLACE FUNCTION public.credit_daily_seller_wallets(
  p_date date DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_amount numeric;
  v_credit_id uuid;
BEGIN
  FOR r IN SELECT id FROM public.sellers LOOP
    v_amount := public.compute_seller_daily_net_earnings(r.id, p_date);

    -- Skip zero credits
    IF COALESCE(v_amount, 0) = 0 THEN
      CONTINUE;
    END IF;

    -- Idempotency: only credit once per seller per date
    INSERT INTO public.seller_daily_wallet_credits (seller_id, credit_date, amount)
    VALUES (r.id, p_date, v_amount)
    ON CONFLICT (seller_id, credit_date) DO NOTHING
    RETURNING id INTO v_credit_id;

    IF v_credit_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Ensure wallet exists
    INSERT INTO public.seller_wallets (seller_id, balance)
    VALUES (r.id, 0)
    ON CONFLICT (seller_id) DO NOTHING;

    -- Add transaction
    INSERT INTO public.seller_wallet_transactions (seller_id, type, amount, description)
    VALUES (
      r.id,
      'credit',
      v_amount,
      'Daily earnings credit for ' || to_char(p_date, 'DD Mon YYYY')
    );

    -- Update wallet balance
    UPDATE public.seller_wallets
    SET balance = balance + v_amount,
        updated_at = now()
    WHERE seller_id = r.id;
  END LOOP;
END;
$$;

-- Schedule: 23:59 Asia/Kolkata == 18:29 UTC
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  v_job_id int;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'daily_wallet_credit_2359_ist' LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'daily_wallet_credit_2359_ist',
    '29 18 * * *',
    'SELECT public.credit_daily_seller_wallets();'
  );
END $$;
