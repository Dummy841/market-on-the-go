

## Wholesale Inventory System - Implementation Plan

This is a large, multi-part feature spanning the admin panel, seller dashboard, database schema, and payment flow. Here's the breakdown:

---

### 1. Database Schema (New Tables via Migration)

**`wholesale_products`** - Stores all wholesale inventory items
- `id` (uuid, PK), `product_name` (text), `barcode` (text, unique), `category` (text, FK to subcategories concept), `purchase_price` (numeric), `mrp` (numeric), `selling_price` (numeric), `stock_quantity` (int), `low_stock_alert` (int, default 10), `gst_percentage` (numeric, default 0), `show_in_quick_add` (boolean), `is_active` (boolean, default true), `created_at`, `updated_at`

**`wholesale_product_images`** - Up to 4 images per product
- `id`, `product_id` (FK), `image_url` (text), `display_order` (int), `created_at`

**`wholesale_orders`** - Orders placed by sellers
- `id` (text, auto-generated), `seller_id` (uuid, FK), `seller_name` (text), `items` (jsonb), `total_amount` (numeric), `delivery_address` (text), `delivery_latitude` (numeric), `delivery_longitude` (numeric), `upi_transaction_id` (text), `payment_proof_url` (text), `payment_status` (text: pending/verified/rejected), `order_status` (text: pending/verified/dispatched/delivered/cancelled), `admin_notes` (text), `created_at`, `updated_at`

**`wholesale_barcode_sequence`** - Tracks auto-increment barcode (starting at 10001)
- `id`, `last_barcode` (int, default 10000)

RLS: Permissive policies for admin full access, sellers can read products and create/view their own orders.

**Storage bucket**: `wholesale-images` (public) for product images and payment proofs.

---

### 2. Admin Panel Changes

**A. Sidebar** (`DashboardSidebar.tsx`)
- Add "Wholesale Inventory" and "Wholesale Orders" under Management group

**B. New Page: `src/pages/dashboard/WholesaleInventory.tsx`**
- Table showing all wholesale products (name, barcode, category, MRP, selling price, stock, status, actions)
- "Add Product" button opens modal
- Action buttons: Edit, View per row

**C. Add Product Modal**
- Fields: Product Name*, Barcode (auto-generated from sequence, with camera scan option), Category (dropdown of subcategories), Purchase Price, MRP*, Selling Price*, Stock Quantity, Low Stock Alert, GST %, Show in Quick Add toggle
- Image upload: up to 4 images with preview
- Barcode scanner uses device camera via `navigator.mediaDevices` + barcode detection API (or manual input fallback)

**D. New Page: `src/pages/dashboard/WholesaleOrders.tsx`**
- Table of all wholesale orders from sellers
- Columns: Order ID, Seller Name, Items, Amount, Payment Status, Order Status, Actions
- Admin can: View payment proof, Verify/Reject payment, Dispatch order, Update status

---

### 3. Seller Dashboard Changes

**A. Navigation** (`SellerDashboard.tsx`)
- Add "Shop Wholesale" button beside "My Earnings" in the nav bar

**B. New Page: `src/pages/SellerWholesale.tsx`**
- Browse all wholesale products in a grid/list
- Add to cart functionality (separate wholesale cart)
- Checkout flow:
  - Shows seller's pre-existing address (from `seller_latitude`/`seller_longitude`)
  - Order summary with items and total
  - Payment page: UPI deep link to `2755c@ybl` with auto-amount
  - After payment: upload payment screenshot as proof, submit order

---

### 4. Routes (`App.tsx`)
- `/dashboard/wholesale-inventory` → WholesaleInventory
- `/dashboard/wholesale-orders` → WholesaleOrders  
- `/seller-wholesale` → SellerWholesale (browse + cart + checkout)

---

### 5. File Summary

| File | Action |
|------|--------|
| Migration SQL | Create 4 new tables + storage bucket |
| `DashboardSidebar.tsx` | Add 2 new sidebar items |
| `App.tsx` | Add 3 new routes |
| `src/pages/dashboard/WholesaleInventory.tsx` | New - admin product management |
| `src/pages/dashboard/WholesaleOrders.tsx` | New - admin order management |
| `src/pages/SellerWholesale.tsx` | New - seller wholesale shopping + checkout |
| `src/components/WholesaleProductModal.tsx` | New - add/edit product modal |
| `src/components/WholesaleProductViewModal.tsx` | New - view product details |
| `src/components/WholesaleCartContext.tsx` | New - wholesale cart state |

---

### 6. Key Implementation Details

- **Barcode auto-generation**: A DB sequence starting at 10001; each new product gets next number. Scanning uses the browser's `BarcodeDetector` API with camera fallback.
- **UPI Payment**: Uses `upi://pay?pa=2755c@ybl&am={amount}&pn=Zippy Wholesale` intent URL to open UPI apps on mobile.
- **Payment proof**: Seller uploads screenshot to `wholesale-images` bucket, stored as `payment_proof_url` on the order.
- **Admin verification**: Admin views proof image, marks payment as verified/rejected, then dispatches order and updates status.

This is a substantial feature. I recommend implementing it in phases, starting with the database + admin inventory, then seller shopping flow, then orders management.

