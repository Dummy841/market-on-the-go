
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to admin_roles" ON public.admin_roles FOR ALL USING (true) WITH CHECK (true);

-- Seed default roles
INSERT INTO public.admin_roles (role_name, description) VALUES
  ('admin', 'Full access to all features'),
  ('manager', 'Can manage orders, sellers, and employees'),
  ('employee', 'Basic access to dashboard')
ON CONFLICT (role_name) DO NOTHING;
