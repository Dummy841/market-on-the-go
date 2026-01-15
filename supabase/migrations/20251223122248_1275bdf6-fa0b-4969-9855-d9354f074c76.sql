
-- Insert demo seller
INSERT INTO sellers (
  owner_name, seller_name, mobile, password_hash, 
  account_number, bank_name, ifsc_code, 
  status, is_online, category, franchise_percentage,
  seller_latitude, seller_longitude
) VALUES (
  'Demo Owner', 'Demo Restaurant', '9999999999', '123456',
  '1234567890', 'Demo Bank', 'DEMO0001234',
  'approved', true, 'food_delivery', 10,
  17.385044, 78.486671
);

-- Insert demo items for the demo seller
INSERT INTO items (seller_id, item_name, seller_price, franchise_price, is_active) 
SELECT id, 'Chicken Biryani', 180, 200, true FROM sellers WHERE mobile = '9999999999';

INSERT INTO items (seller_id, item_name, seller_price, franchise_price, is_active) 
SELECT id, 'Mutton Biryani', 280, 320, true FROM sellers WHERE mobile = '9999999999';

INSERT INTO items (seller_id, item_name, seller_price, franchise_price, is_active) 
SELECT id, 'Veg Biryani', 120, 140, true FROM sellers WHERE mobile = '9999999999';

INSERT INTO items (seller_id, item_name, seller_price, franchise_price, is_active) 
SELECT id, 'Paneer Butter Masala', 160, 180, true FROM sellers WHERE mobile = '9999999999';

INSERT INTO items (seller_id, item_name, seller_price, franchise_price, is_active) 
SELECT id, 'Butter Naan', 30, 40, true FROM sellers WHERE mobile = '9999999999';

INSERT INTO items (seller_id, item_name, seller_price, franchise_price, is_active) 
SELECT id, 'Chicken 65', 150, 170, true FROM sellers WHERE mobile = '9999999999';
