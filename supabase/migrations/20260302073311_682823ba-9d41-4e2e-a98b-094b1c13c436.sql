INSERT INTO public.users (id, name, mobile)
VALUES ('00000000-0000-0000-0000-000000000000', 'Walk-in Customer', 'N/A')
ON CONFLICT (id) DO NOTHING;