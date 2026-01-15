-- Add profile_photo_url column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Create user-profiles storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-profiles', 'user-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for user profile photos
CREATE POLICY "User profile photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-profiles');

CREATE POLICY "Users can upload their own profile photo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-profiles');

CREATE POLICY "Users can update their own profile photo" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-profiles');

CREATE POLICY "Users can delete their own profile photo" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-profiles');