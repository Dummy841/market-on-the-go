
CREATE TABLE public.exotel_calls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text,
  caller_mobile text NOT NULL,
  callee_mobile text NOT NULL,
  caller_type text NOT NULL,
  exotel_call_sid text,
  status text NOT NULL DEFAULT 'initiated',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exotel_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to exotel_calls"
ON public.exotel_calls
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_exotel_calls_order_id ON public.exotel_calls(order_id);
