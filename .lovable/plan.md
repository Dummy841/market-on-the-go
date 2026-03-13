

## Plan: POS Layout Fixes, Cart Persistence, Telugu Name Support & Bilingual Receipts

### 1. Fix POS Header Under Status Bar
The `fixed inset-0` layout doesn't account for safe-area insets. Add `pt-[env(safe-area-inset-top)]` to the root container so the header stays below the status bar.

**File:** `src/pages/SellerPOS.tsx` (line 237)

### 2. Show All Cart Columns on Mobile (Reorder)
Currently mobile hides Barcode, Disc%, Tax, MRP columns via `hidden md:table-cell`. Change column order to: #, Product, Qty, Net, then show Barcode, MRP, Disc%, Tax as additional visible columns (smaller text). Remove the `hidden md:table-cell` classes. Remove the S.No (#) column — freeze it is not needed.

Column order: **Product, Qty, Net, MRP, Disc%, Tax, Barcode, Delete**. All visible, with secondary columns in smaller text.

**File:** `src/pages/SellerPOS.tsx`

### 3. Persist Cart in localStorage Instead of sessionStorage
Change `sessionStorage` to `localStorage` so cart survives page refreshes, navigation away, and app restarts. Items remain until order completes or manual delete.

**File:** `src/pages/SellerPOS.tsx` (lines 43-56) — replace `sessionStorage` with `localStorage`

### 4. Faster UPI QR Code Generation
Replace the external API call (`api.qrserver.com`) with a client-side QR generation approach. Use a `data:` URI with a canvas-based QR generator or inline SVG. The simplest approach: generate the UPI string as a `data:` URI directly using a lightweight inline QR code library. Will use a simple canvas-based QR code generator function embedded directly, avoiding any new dependency.

**File:** `src/components/POSCheckoutModal.tsx` — replace the `<img src="https://api.qrserver.com/...">` with a canvas-rendered QR code using a small inline QR generation utility, or preload the image when the checkout modal opens (eagerly fetch when UPI step isn't yet selected).

Simpler approach: **Preload** the QR image as soon as the modal opens (not just when UPI is clicked), so it's already cached when the user taps UPI.

### 5. Add Telugu Name Fields to Seller Items
**Database migration:** Add `telugu_name` column to the `items` table.

**Files:**
- `src/components/SellerItemsForm.tsx` — Add two fields below Item Name: "Telugu Name" (input, shows Telugu script) and an "Auto Translate" button that calls Google Translate API (free endpoint) to translate the English item_name to Telugu.
- `src/components/EditItemModal.tsx` — Same fields for editing.
- Save `telugu_name` to the items table.

For auto-translation, use the free Google Translate URL: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=te&dt=t&q=TEXT`. This doesn't require an API key.

### 6. Bilingual Receipt Printing (Telugu / English)
Replace auto-print with two buttons: **"Print in Telugu"** and **"Print in English"**.

- After payment completes, show a small dialog/section with both print buttons instead of auto-printing.
- "Print in English" prints current receipt as-is.
- "Print in Telugu" prints receipt using `telugu_name` from the cart items for product names. Need to fetch `telugu_name` for cart items from the database before printing.

**Files:**
- `src/components/POSCheckoutModal.tsx` — Add post-payment state showing two print buttons. Modify `printReceipt` to accept a `language` parameter. Fetch `telugu_name` for items when printing in Telugu.
- Update CartItem interface to include `telugu_name`.
- Update `src/pages/SellerPOS.tsx` Item interface to include `telugu_name` and fetch it.

### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/SellerPOS.tsx` | Safe-area padding, show all columns, localStorage cart, fetch telugu_name |
| `src/components/POSCheckoutModal.tsx` | Preload QR, bilingual print buttons, post-payment print UI |
| `src/components/SellerItemsForm.tsx` | Telugu name input + auto-translate |
| `src/components/EditItemModal.tsx` | Telugu name input + auto-translate |
| **Database migration** | Add `telugu_name text` column to `items` table |

