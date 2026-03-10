ALTER TABLE public.production_entries 
ADD COLUMN manufacture_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN expiry_date date,
ADD COLUMN best_before text;