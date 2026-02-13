

# Home Screen and Checkout Improvements

## Changes Summary

### 1. Home Screen - Remove Location-Based Filtering
Currently, products on the home screen are filtered to only show items within 10km. This will be removed so **all products from all sellers** are shown regardless of user location. Products will still be sorted by distance when location is available, but nothing will be filtered out.

### 2. Home Screen - Hide Subcategory Bar When No Products
If there are no products at all, the subcategory filter bar and the "No products available" message will be hidden entirely -- a clean empty state.

### 3. Home Screen - Remove ScrollBar Indicator Line
The horizontal scroll indicator line under the subcategory bar will be removed by hiding the `ScrollBar` component.

### 4. Home Screen - Fix Cart Button Position
The green "View Cart" floating button will be positioned at the bottom of the screen with a small gap, not offset by the old bottom nav height.

### 5. Checkout - Expected Delivery Time Display
Below the delivery address section, show an expected delivery time based on distance from the seller:
- Within 5km: **30 min**
- Within 10km: **60 min**  
- Within 20km: **1-2 days**
- Above 20km: **2-5 days**

### 6. Checkout - State-Based Delivery Restriction
Delivery is restricted to addresses within **Andhra Pradesh, Telangana, Karnataka, and Tamil Nadu**. If the address is outside these states, show a message "We can't deliver to your location" and **disable the Pay button**.

The state detection will use reverse geocoding from the address string (checking if the address text contains one of the allowed state names).

---

## Technical Details

### File: `src/components/HomeProductsGrid.tsx`
- **Remove distance filter**: Remove the `.filter(item => item.distance <= 10)` block. Keep the distance calculation and sorting, but do not exclude any items.
- **Hide subcategory bar when empty**: Only render `SubcategoryBar` when `items.length > 0`.
- **Remove ScrollBar**: Remove `<ScrollBar orientation="horizontal" />` from the SubcategoryBar.

### File: `src/pages/Index.tsx`
- **Fix cart button position**: Change `bottom-[calc(4rem+env(safe-area-inset-bottom))]` to `bottom-4` so it sits at the bottom with a small gap.

### File: `src/pages/Checkout.tsx`
- **Add delivery time estimation**: After the delivery address card, compute distance from seller to selected address and display the expected delivery time.
- **Add state validation**: Parse the selected address string for state names. If the address doesn't contain any of the allowed states (Andhra Pradesh, Telangana, Karnataka, Tamil Nadu), show an error message and disable the Pay button.
- **Add new state variables**: `deliveryTimeEstimate` (string) and `isDeliveryStateValid` (boolean).
- **Disable Pay button**: Add `!isDeliveryStateValid` to the disabled condition of the Pay button.

### File: `src/lib/distanceUtils.ts`
- **Add delivery estimate function**: New helper `getExpectedDeliveryTime(distanceKm)` returning the appropriate time string based on the distance ranges specified.

