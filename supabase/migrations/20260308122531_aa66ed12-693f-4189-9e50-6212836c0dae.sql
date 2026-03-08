
CREATE TABLE public.production_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name text NOT NULL,
  batch_number text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to production_entries" ON public.production_entries FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_production_entries_updated_at BEFORE UPDATE ON public.production_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
