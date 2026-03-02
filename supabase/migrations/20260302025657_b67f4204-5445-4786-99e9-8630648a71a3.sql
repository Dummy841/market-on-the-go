
-- Wholesale Products table
CREATE TABLE public.wholesale_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name text NOT NULL,
  barcode text UNIQUE NOT NULL,
  category text,
  purchase_price numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_alert integer NOT NULL DEFAULT 10,
  gst_percentage numeric NOT NULL DEFAULT 0,
  show_in_quick_add boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to wholesale_products" ON public.wholesale_products FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_wholesale_products_updated_at
BEFORE UPDATE ON public.wholesale_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wholesale Product Images table
CREATE TABLE public.wholesale_product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.wholesale_products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to wholesale_product_images" ON public.wholesale_product_images FOR ALL USING (true) WITH CHECK (true);

-- Wholesale Orders table
CREATE TABLE public.wholesale_orders (
  id text NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  seller_id uuid NOT NULL,
  seller_name text NOT NULL,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  delivery_address text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  upi_transaction_id text,
  payment_proof_url text,
  payment_status text NOT NULL DEFAULT 'pending',
  order_status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to wholesale_orders" ON public.wholesale_orders FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_wholesale_orders_updated_at
BEFORE UPDATE ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wholesale Barcode Sequence table
CREATE TABLE public.wholesale_barcode_sequence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  last_barcode integer NOT NULL DEFAULT 10000
);

ALTER TABLE public.wholesale_barcode_sequence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to wholesale_barcode_sequence" ON public.wholesale_barcode_sequence FOR ALL USING (true) WITH CHECK (true);

-- Insert initial row
INSERT INTO public.wholesale_barcode_sequence (last_barcode) VALUES (10000);

-- Wholesale order ID generator function
CREATE OR REPLACE FUNCTION public.generate_wholesale_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  date_code TEXT;
  next_seq INTEGER;
BEGIN
  date_code := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO next_seq
  FROM public.wholesale_orders
  WHERE created_at::date = CURRENT_DATE;
  RETURN 'WH' || date_code || LPAD(next_seq::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-set wholesale order ID
CREATE OR REPLACE FUNCTION public.set_wholesale_order_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' OR NEW.id ~ '^[0-9a-f]{8}-' THEN
    NEW.id := generate_wholesale_order_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_wholesale_order_id_trigger
BEFORE INSERT ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.set_wholesale_order_id();

-- Storage bucket for wholesale images
INSERT INTO storage.buckets (id, name, public) VALUES ('wholesale-images', 'wholesale-images', true);

CREATE POLICY "Allow all access to wholesale images" ON storage.objects FOR ALL USING (bucket_id = 'wholesale-images') WITH CHECK (bucket_id = 'wholesale-images');
