
-- Create the seller-images bucket that subcategory image uploads use
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-images', 'seller-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from seller-images
CREATE POLICY "Public read access on seller-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'seller-images');

-- Allow anyone to upload to seller-images
CREATE POLICY "Allow uploads to seller-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'seller-images');

-- Allow anyone to update in seller-images
CREATE POLICY "Allow updates in seller-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'seller-images');

-- Allow anyone to delete from seller-images
CREATE POLICY "Allow deletes from seller-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'seller-images');
