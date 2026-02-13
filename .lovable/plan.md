

# Fix Subcategory Filter Bar and Delivery Fee Overhaul

## Issue 1: Subcategory Filter Buttons Disappearing

**Root Cause:** When a subcategory is selected, the `fetchProducts` function filters the `items` array (line 183-184). The subcategory bar checks which subcategories have products using the filtered `items` list, so unselected subcategories appear empty and get hidden.

**Fix:** Store all unfiltered items in a separate `allItems` state variable. Use `allItems` (not `items`) to determine which subcategories have products. Only use the filtered `items` for rendering the product grid.

### File: `src/components/HomeProductsGrid.tsx`
- Add new state: `allItems` to hold the full unfiltered product list
- After fetching and sorting, save to `allItems` before applying subcategory filter
- Change `subcategoriesWithProducts` to filter against `allItems` instead of `items`

---

## Issue 2: New Delivery Fee Structure

Replace the current simple fee logic with a distance-based tiered system.

### Delivery Fee Rules (based on distance from seller to delivery address):

| Distance | Free Delivery If Order Above | Fee If Below |
|----------|------------------------------|--------------|
| Within 5km | 499 | 19 |
| Within 10km | 799 | 29 |
| Within 20km | 2000 | 59 |
| Above 20km | 5000 | 99 |
| Any distance | 5000+ order | Free (always) |

### Small Order Fee
- 50% of the delivery fee (only if delivery fee applies)
- Example: if delivery fee is 29, small order fee is 14.50 (rounded to 15)

### Zippy Pass Rules
- Zippy Pass only waives delivery fee (not small order fee)
- Zippy Pass free delivery works only up to 10km
- Beyond 10km, Zippy Pass holders pay normal delivery fee
- Mention "Free delivery up to 10km" for Zippy Pass

### File: `src/pages/Checkout.tsx`
- Calculate distance between seller and delivery address
- Use distance to determine delivery fee tier
- Replace current fee calculation (lines 288-291) with new logic
- Small order fee = `Math.round(deliveryFee * 0.5)` (only when delivery fee > 0)
- Update Zippy Pass logic: only waive delivery fee if distance is within 10km
- Remove the 10km distance validation block that shows `DeliveryNotAvailableModal` (lines 810-841) since we now allow all distances
- Remove `validateAddressDistance` function and `isAddressValid` state (no longer needed since we removed 10km restriction)
- Remove `DeliveryNotAvailableModal` import and usage entirely
- Add note in Zippy Pass section: "Free delivery up to 10km only"

### File: `src/lib/distanceUtils.ts`
- Add new helper function `getDeliveryFee(distanceKm, orderAmount)` returning the fee amount
- This keeps the fee logic centralized and testable

---

## Technical Details

### New fee calculation function in `distanceUtils.ts`:

```text
getDeliveryFee(distanceKm, orderAmount):
  if orderAmount >= 5000 -> return 0
  if distanceKm <= 5 -> return orderAmount >= 499 ? 0 : 19
  if distanceKm <= 10 -> return orderAmount >= 799 ? 0 : 29
  if distanceKm <= 20 -> return orderAmount >= 2000 ? 0 : 59
  return orderAmount >= 5000 ? 0 : 99  (above 20km)
```

### Updated Checkout.tsx fee section:

```text
distance = calculated from seller coords to delivery address coords
deliveryFeeBase = getDeliveryFee(distance, itemTotal)
deliveryFee = hasActivePass && distance <= 10 ? 0 : deliveryFeeBase
smallOrderFee = deliveryFeeBase > 0 ? Math.round(deliveryFeeBase * 0.5) : 0
  (Note: small order fee based on base fee, not after Zippy Pass discount)
platformFee = Math.round(itemTotal * 0.05)
```

### Files to modify:
1. **`src/components/HomeProductsGrid.tsx`** -- Fix subcategory bar using `allItems` state
2. **`src/lib/distanceUtils.ts`** -- Add `getDeliveryFee()` function
3. **`src/pages/Checkout.tsx`** -- Replace fee logic, update Zippy Pass behavior, remove 10km modal/validation

