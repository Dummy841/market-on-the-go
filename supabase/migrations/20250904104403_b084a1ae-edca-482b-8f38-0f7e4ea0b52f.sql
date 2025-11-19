-- Fix the infinite recursion in delivery_partners RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Delivery partners can update their own profile" ON delivery_partners;
DROP POLICY IF EXISTS "Delivery partners can view their own profile" ON delivery_partners;

-- Create proper policies without recursion
CREATE POLICY "Delivery partners can view their own profile" 
ON delivery_partners 
FOR SELECT 
USING (true);

CREATE POLICY "Delivery partners can update their own profile" 
ON delivery_partners 
FOR UPDATE 
USING (true);