
CREATE OR REPLACE FUNCTION public.compute_seller_daily_net_earnings(p_seller_id uuid, p_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_day_start := (p_date::timestamp AT TIME ZONE 'Asia/Kolkata');
  v_day_end := ((p_date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata');

  -- Sum seller_price * quantity for delivered orders, EXCLUDING POS orders
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
    AND o.delivery_address != 'POS - In Store'
    AND o.created_at >= v_day_start
    AND o.created_at < v_day_end;

  v_delivered_net := v_delivered_items_total * (1 - (v_franchise_pct / 100));

  -- Penalty for rejected/refunded orders, EXCLUDING POS orders
  SELECT COUNT(*)
  INTO v_rejected_count
  FROM public.orders o
  WHERE o.seller_id = p_seller_id
    AND o.status IN ('rejected', 'refunded')
    AND o.delivery_address != 'POS - In Store'
    AND o.created_at >= v_day_start
    AND o.created_at < v_day_end;

  v_penalty := v_rejected_count * 10;

  RETURN COALESCE(v_delivered_net, 0) - COALESCE(v_penalty, 0);
END;
$function$;
