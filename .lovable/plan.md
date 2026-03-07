

## Plan: Product Ordering, Card Redesign, UI Fixes, Telugu Print Fix, Revenue Fix

### 1. Products ordered by subcategory display_order
**File:** `src/components/HomeProductsGrid.tsx`
- Currently `groupedItems` is built using `Record<string, Item[]>` keyed by subcategory name — order is not guaranteed to match `display_order`
- Add `subcategory_display_order` to Item interface and populate from the subcategory query
- When building grouped items, use the subcategories list (already ordered by `display_order`) to iterate and build groups in correct order, instead of using `Object.entries(groupedItems)`
- Render groups by iterating `subcategories` array (which is pre-sorted) and showing items for each

### 2. Product card: "₹X OFF" instead of "X% OFF", add MRP/Sale labels, increase text sizes
**File:** `src/components/HomeProductCard.tsx`
- Change discount badge from `{discountPercent}% OFF` to `₹{mrp - seller_price} OFF`
- Add "MRP" label before the strikethrough price: `MRP ₹{mrp}`
- Add "Sale" label before the selling price: `Sale ₹{seller_price}`
- Increase all text sizes by ~1 point: `text-[10px]` → `text-[11px]`, `text-[9px]` → `text-[10px]`, `text-xs` → `text-sm`

### 3. Increase subcategory filter sizes
**File:** `src/components/HomeProductsGrid.tsx`
- Increase circle from `w-14 h-14` → `w-16 h-16`
- Increase label from `text-[10px]` → `text-[11px]`
- Increase max-width from `max-w-[60px]` → `max-w-[70px]`

### 4. Fix Android header spacing & remove notification banner
**File:** `src/pages/Index.tsx`
- Remove `<NotificationPermissionBanner />` component entirely from the Index page
- The notification banner was causing overlap and pushing content down on different devices

**File:** `src/components/Header.tsx`
- Remove any extra padding/spacing. The `pt-[env(safe-area-inset-top)]` on the sticky header should handle the status bar offset. Ensure no double-padding.

### 5. Fix location detection
**File:** `src/components/Header.tsx`
- The `getCurrentLocation` function uses `enableHighAccuracy: true, timeout: 15000` which can fail on some devices
- Add a fallback: if high accuracy fails, retry with `enableHighAccuracy: false` and shorter timeout
- Also try loading cached coordinates from localStorage on initial load for instant display

### 6. Fix Telugu printing — POSTransactions & POSCheckoutModal
The root cause: when orders are stored, items have `item_id` field (not `id`). But `fetchTeluguNames` in POSTransactions looks for `i.id`.

**File:** `src/pages/POSTransactions.tsx`
- In `fetchTeluguNames`, change `items.map(i => i.id)` to `items.map(i => (i as any).item_id || i.id)`
- In `handlePrint`, when mapping items with Telugu names, use `(i as any).item_id || i.id` as the key

**File:** `src/components/POSCheckoutModal.tsx`  
- The checkout modal print works correctly since it uses `cart` items which have proper `id` fields
- But verify `teluguNames` map is populated — the `fetchTeluguNames` runs on modal open, should be fine

### 7. Dashboard Revenue — exclude POS transactions
**File:** `src/pages/dashboard/Revenue.tsx`
- Add `.neq('delivery_address', 'POS - In Store')` to the orders query (line 52)
- This ensures only online delivery orders are counted in revenue calculations
- Also add the same filter to refunded orders query (line 116) and penalty query (line 130)

### Summary of Files

| File | Changes |
|------|---------|
| `src/components/HomeProductsGrid.tsx` | Order groups by subcategory display_order, increase filter sizes |
| `src/components/HomeProductCard.tsx` | ₹X OFF badge, MRP/Sale labels, increase text sizes |
| `src/pages/Index.tsx` | Remove NotificationPermissionBanner |
| `src/components/Header.tsx` | Fix location fallback for different devices |
| `src/pages/POSTransactions.tsx` | Fix Telugu print item_id mapping |
| `src/pages/dashboard/Revenue.tsx` | Exclude POS orders from revenue calculations |

