

## Plan: Product Confirmation Before Marking as Packed

### Overview
When a seller clicks "Mark as Packed" on an accepted order, instead of immediately packing, a **Product Confirmation Modal** opens. The seller must verify each order item by scanning its barcode (or photographing it for fruits/vegetables). Only after all items are confirmed can the order be marked as packed.

### How It Works

1. **Trigger**: When seller clicks "Mark as Packed" on an accepted order, open a new `ProductConfirmationModal` instead of directly updating status.

2. **Modal UI**: Shows all order items as a checklist. Each item row shows:
   - Item name, quantity, and price
   - A green checkmark icon when confirmed
   - A **Scan** button (right side) to scan that item's barcode
   - For fruits/vegetables subcategory items: a **Photo** button instead of Scan

3. **Barcode Scanning Flow**:
   - Clicking "Scan" opens the device camera using `BarcodeDetector` API (reusing pattern from `POSBarcodeScannerModal`)
   - Scanned barcode is matched against the item's barcode in the `items` table (queried by item ID)
   - If matched: green tick on that item + beep sound
   - If not matched: show "Product not matched" error toast
   - Seller scans items one by one

4. **Fruits & Vegetables Flow**:
   - For items whose `subcategory_id` maps to a subcategory with category = "Fruits & Vegetables" (or similar), show a **Photo** button instead of Scan
   - Opens camera in portrait mode with background blur CSS (object-fit + backdrop-filter styling to simulate depth-of-field focus)
   - Seller takes a photo → item is marked as confirmed (photo serves as visual verification record)

5. **Completion**: 
   - "Mark as Packed" button at bottom is **disabled** until all items have green ticks
   - Once all confirmed, clicking it calls `updateOrderStatus(orderId, 'packed', 'seller_packed_at')`

### Technical Details

**New Component**: `src/components/ProductConfirmationModal.tsx`
- Props: `open`, `onOpenChange`, `order` (the selected order), `onConfirmed` (callback to mark as packed)
- State: `confirmedItems: Set<string>` tracking confirmed item IDs
- State: `scanningItemId: string | null` for which item is being scanned
- State: `photoItemId: string | null` for which item is being photographed

**Database Queries**:
- Fetch items with subcategory info: `supabase.from('items').select('id, barcode, subcategory_id').in('id', itemIds)` 
- Fetch subcategories to identify fruits/vegetables: `supabase.from('subcategories').select('id, name, category').in('id', subcategoryIds)`
- Match logic: compare scanned barcode against item's `barcode` field

**Modification to `SellerOrderManagement.tsx`**:
- In `getActionButtons`, for `accepted` status, instead of directly calling `updateOrderStatus`, open the `ProductConfirmationModal`
- Add state for `showProductConfirmation` and pass `selectedOrder` to the modal

**Camera/Scanner**: Reuse the BarcodeDetector pattern from `POSBarcodeScannerModal.tsx` — camera stream, detection loop, beep sound on match.

**Photo for Fruits/Vegetables**: Use `navigator.mediaDevices.getUserMedia` with portrait-oriented video, apply CSS blur to outer edges of the video feed to create a focused-center effect. Capture frame on button click to confirm.

### Files Changed
1. **New**: `src/components/ProductConfirmationModal.tsx` — the confirmation modal with scan/photo logic
2. **Modified**: `src/components/SellerOrderManagement.tsx` — wire up the modal before "Mark as Packed"

