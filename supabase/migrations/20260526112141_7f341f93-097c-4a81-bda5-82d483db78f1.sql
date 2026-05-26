ALTER TABLE public.admin_employees ADD COLUMN IF NOT EXISTS face_descriptor jsonb;
ALTER TABLE public.admin_employees ALTER COLUMN password_hash DROP NOT NULL;