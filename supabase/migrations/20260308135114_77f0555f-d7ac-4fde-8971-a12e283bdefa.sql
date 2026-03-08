
CREATE TABLE IF NOT EXISTS public.admin_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  email text,
  profile_photo_url text,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_employees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all access to admin_employees" ON public.admin_employees FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.admin_employees (name, mobile, email, password_hash, role)
VALUES ('Admin', '9502395261', NULL, public.hash_password('Zippy@Admin2026!'), 'admin')
ON CONFLICT (mobile) DO NOTHING;
