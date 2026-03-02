

## Plan: Add POS (Point of Sale) Page for Sellers

### Overview
Add a "POS" button next to "Shop Wholesale" on the seller dashboard. Clicking it navigates to a new POS page where sellers can search/scan their own products, add them to a billing cart, and checkout with customer assignment and payment method selection.

### New Files

**1. `src/pages/SellerPOS.tsx`** - Main POS page with:
- **Top bar**: Search product input (searches seller's own `items` table by name), Barcode input field (auto-adds product when barcode matches), Camera scan button (opens device camera using `getUserMedia` + barcode detection similar to the multi-scan reference image)
- **Cart table**: Columns: #, Product, Barcode, Qty (with +/- controls), Disc%, Tax, MRP, Net
- **Bottom summary bar**: Items count, Qty total, Disc total, Tax total, MRP total, Net Amount
- **"Proceed to Checkout" button** -> opens Complete Payment dialog

**2. `src/components/POSCheckoutModal.tsx`** - Payment dialog with:
- Title "Complete Payment" with total amount
- **Customer section**: "Walk-in Customer" default, search input (searches `users` table by mobile or name)
- If no customer found: "No customers found" message + "Add New Customer" button
- **Add Customer nested dialog**: Name (required), Phone (optional) fields -> inserts into `users` table
- **Payment Method**: 3 cards - Quick Pay (Cash), UPI Pay (QR), Card Pay (Receipt ID)
- Cancel button

**3. `src/components/POSBarcodeScannerModal.tsx`** - Camera scanner modal:
- Opens rear camera via `getUserMedia`
- Uses `BarcodeDetector` API (or fallback) to detect barcodes from camera stream
- Shows "Multi Scan" header with close button
- Lists scanned items below camera feed with quantities and totals
- "Add X items to Cart" button at bottom

### Modified Files

**4. `src/pages/SellerDashboard.tsx`**:
- Add POS nav item: `{ id: 'pos', label: 'POS', icon: Monitor, action: () => navigate('/seller-pos') }` after the wholesale button

**5. `src/App.tsx`**:
- Add route: `<Route path="/seller-pos" element={<SellerPOS />} />`

### Data Flow
- POS fetches products from `items` table filtered by `seller_id`
- Barcode field: on Enter, queries `items` where `barcode = input AND seller_id = seller.id`, auto-adds to cart
- Camera scanner: detects barcode from camera, looks up in seller's items, adds to scanned list
- Checkout: searches `users` table by mobile/name for customer assignment
- On payment completion: creates a record in `orders` table (or a new `pos_sales` table)

### Technical Details
- No new database tables needed initially - POS sales can use existing `orders` table with `payment_method: 'cash'|'upi'|'card'`
- Camera scanning uses the Web `BarcodeDetector` API with `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Cart state managed locally in POS page component
- Discount calculation: `((MRP - selling_price) / MRP * 100)` displayed as Disc%
- Tax calculation: uses `gst_percentage` from items table

