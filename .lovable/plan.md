

## Fixes and Enhancements for Wholesale System

### Issue 1: Category dropdown not showing options
The `SelectContent` inside `DialogContent` has a z-index issue - the dialog's `max-h-[90vh] overflow-y-auto` clips the dropdown. Fix by adding `className="z-[9999]"` to `SelectContent` (same pattern used elsewhere in the project per memory).

**File:** `src/components/WholesaleProductModal.tsx` (line 313)

---

### Issue 2: Seller Wholesale - My Orders, Tracking, Invoice

Add to `SellerWholesale.tsx`:
- **"My Orders" button** in the header beside cart
- **New step: `orders`** showing seller's wholesale orders with status tracking (pending → verified → dispatched → delivered)
- **Delivery PIN display**: Generate a random 4-digit `delivery_pin` when order is created, store in `wholesale_orders` table, show on seller's order card
- **"View Invoice" button** on delivered orders opening a simple invoice breakdown modal

**Database migration needed:**
- Add `delivery_pin` column (text) to `wholesale_orders` table

**File:** `src/pages/SellerWholesale.tsx` - add orders list step with status badges, PIN display, and invoice modal

---

### Issue 3: Admin - Mark as Delivered with PIN verification

In `WholesaleOrders.tsx`:
- After "dispatched" status, show a **"Mark as Delivered"** button
- Clicking it opens a **4-digit PIN verification modal** (reuse `PinVerificationModal` pattern)
- Admin enters the PIN shared by the seller; if it matches the `delivery_pin` stored on the order, status updates to "delivered"

**File:** `src/pages/dashboard/WholesaleOrders.tsx` - add delivered button + PIN modal

---

### Summary of Changes

| File | Change |
|------|--------|
| Migration SQL | Add `delivery_pin` column to `wholesale_orders` |
| `WholesaleProductModal.tsx` | Add `z-[9999]` to `SelectContent` |
| `SellerWholesale.tsx` | Add "My Orders" button, orders list with tracking/PIN/invoice |
| `WholesaleOrders.tsx` | Add "Mark as Delivered" button with PIN verification |

