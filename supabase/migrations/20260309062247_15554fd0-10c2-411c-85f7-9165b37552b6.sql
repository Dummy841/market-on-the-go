
CREATE TABLE public.terms_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.terms_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage terms_conditions" ON public.terms_conditions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view active terms" ON public.terms_conditions FOR SELECT USING (is_active = true);
