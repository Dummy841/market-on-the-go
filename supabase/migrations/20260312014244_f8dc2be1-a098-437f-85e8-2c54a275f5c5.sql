CREATE TABLE public.privacy_policy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage privacy_policy" ON public.privacy_policy FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can view active privacy policy" ON public.privacy_policy FOR SELECT USING (is_active = true);