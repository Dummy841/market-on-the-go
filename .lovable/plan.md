

## Plan: Multi-Seller Cart, 10km Filter, Split Orders & Order UI Improvements

This is a large feature spanning the home page, cart, checkout, order creation, and order history. Here is the breakdown:

---

### 1. Home Screen: 10km Distance Filter

**File: `src/components/HomeProductsGrid.tsx`**

Currently items are sorted by distance but NOT filtered. Add a 10km cutoff filter after distance calculation:

```ts
// After calculating distance, filter to 10km
formattedItems = formattedItems.filter(item => (item.distance || Infinity) <= 10);
```

This applies whether user is logged in (using selectedAddress) or not (using GPS/currentLat).

---

### 2. Enable Multi-Seller Cart

**File: `src/contexts/CartContext.tsx`**

- Remove the single-seller restriction in `addToCart` (the `if (cartRestaurant && cartRestaurant !== item.seller_id)` check)
- Remove the single `cartRestaurant/Name/Lat/Lng` tracking since cart now holds items from multiple sellers
- Keep `cartItems` with `seller_id`, `seller_name`, `seller_latitude`, `seller_longitude` per item
- Add helper: `getSellerIds()` returns unique seller IDs in cart
- Add helper: `getItemsBySeller()` groups cart items by seller

**File: `src/components/HomeProductCard.tsx`**

- Remove the "Different Seller" toast block — multi-seller is now allowed

**File: `src/components/Cart.tsx` & `src/pages/CartPage.tsx`**

- Group cart items by seller name for display
- Show seller name as section header

---

### 3. Checkout: Distance Validation & Split Order Creation

**File: `src/pages/Checkout.tsx`**

Major refactor:

- **Distance check per seller**: For each unique seller in cart, fetch seller coordinates and verify all are within 10km of delivery address. Block checkout if any seller is >10km.
- **Delivery fee**: ₹19 if 1 seller, ₹29 if >1 seller (flat, not per-seller)
- **Split order creation**: On payment success, create one `orders` row per seller with:
  - Only that seller's items
  - `platform_fee` proportional to that seller's item subtotal
  - `delivery_fee` = total delivery fee / number of sellers (split equally)
  - Unique order IDs
- **Total amount** shown to user = sum of all item totals + single delivery fee + single platform fee
- Payment is single (Razorpay or wallet)

---

### 4. Delivery Fee Logic Update

**File: `src/lib/distanceUtils.ts`**

Add or update logic:
```ts
export const getMultiSellerDeliveryFee = (sellerCount: number, orderAmount: number, hasPass: boolean, maxDistance: number): number => {
  if (hasPass && maxDistance <= 10) return 0;
  if (orderAmount >= 299 && maxDistance <= 10) return 0;
  return sellerCount === 1 ? 19 : 29;
};
```

---

### 5. My Orders: Item Images & View Items Modal

**File: `src/pages/MyOrders.tsx`**

- Update the Order interface items to include `item_photo_url`
- On the order card, show the first item's image as a thumbnail
- Add a "View Items" button that opens a dialog/modal
- The modal lists all items with: image, name, quantity, price

**File: `src/pages/Checkout.tsx` (order creation)**

- Include `item_photo_url` in the items JSON saved to the order so it's available in order history

---

### 6. Order Details / Invoice Fee Split

**File: `src/pages/OrderDetails.tsx`**

- Each order already stores its own `delivery_fee` and `platform_fee`, so the invoice will naturally show the split values per order since we store them correctly during creation.

---

### Summary of Files to Modify

| File | Change |
|------|--------|
| `src/components/HomeProductsGrid.tsx` | Add 10km distance filter |
| `src/contexts/CartContext.tsx` | Remove single-seller lock, add multi-seller helpers |
| `src/components/HomeProductCard.tsx` | Remove "Different Seller" toast |
| `src/components/Cart.tsx` | Group items by seller in display |
| `src/pages/CartPage.tsx` | Group items by seller in display |
| `src/pages/Checkout.tsx` | Multi-seller distance validation, split order creation, new fee logic |
| `src/lib/distanceUtils.ts` | Add multi-seller delivery fee function |
| `src/pages/MyOrders.tsx` | Add item images, "View Items" button with modal |

No database migration needed — the existing `orders` table supports this since each order row is per-seller already.

