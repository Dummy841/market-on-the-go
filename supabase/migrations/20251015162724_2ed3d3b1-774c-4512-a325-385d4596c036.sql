-- Create ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(order_id, user_id)
);

-- Add rating column to orders table to track if order has been rated
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_rated BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on ratings table
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings table
CREATE POLICY "Users can create ratings for their orders"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id IN (
        SELECT id FROM public.users WHERE id = ratings.user_id
    )
);

CREATE POLICY "Users can view all ratings"
ON public.ratings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own ratings"
ON public.ratings
FOR UPDATE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM public.users WHERE id = ratings.user_id
    )
);

-- Create function to calculate average rating and count for a seller
CREATE OR REPLACE FUNCTION public.get_seller_rating(seller_uuid UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_ratings BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
        COUNT(*) as total_ratings
    FROM public.ratings
    WHERE seller_id = seller_uuid;
$$;

-- Create trigger to update updated_at column
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ratings_seller_id ON public.ratings(seller_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order_id ON public.ratings(order_id);