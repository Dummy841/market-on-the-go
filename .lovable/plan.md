

## Plan: Remove Online/Offline Gating, Add Time-Based & Distance-Based Checkout Restrictions

### Summary
Currently, sellers' online/offline status blocks users from adding items to cart and viewing menus. The new behavior:
1. **Show all sellers and items regardless of online/offline status** -- remove all offline-related restrictions on browsing and adding to cart
2. **At checkout, enforce a 10km distance limit** from seller to delivery address. If exceeded, show "We can't deliver to your location" and disable the pay button
3. **At checkout, if current IST time is past 10:00 PM**, show "Delivery Tomorrow" as the expected delivery time instead of the normal estimate

### Changes Required

#### 1. `src/components/FeaturedRestaurants.tsx`
- Remove the `isOffline` prop from `RestaurantCard` -- always pass `false`
- Change delivery time display: instead of "Currently not taking orders" for offline sellers, show the normal distance-based delivery time
- Keep the sorting logic (online first is fine for ordering) but remove visual offline indicators

#### 2. `src/components/RestaurantCard.tsx`
- No changes needed if we just pass `isOffline={false}` from parent. The component already handles it.

#### 3. `src/pages/RestaurantMenu.tsx`
- Remove the offline banner at the top of restaurant header (lines 397-406)
- Remove the `disabled` condition on Add button that checks `restaurant.is_online === false` (line 519)
- Change the button text from showing "Offline" to always showing "ADD" (line 523)
- Remove grayscale styling on restaurant image when offline (line 412)
- Remove the "Online"/"Offline" badge next to restaurant name (lines 420-425)
- Remove "Offline" text from delivery time display (line 442)

#### 4. `src/pages/Checkout.tsx`
- Add a `isDistanceTooFar` check: if `deliveryDistance > 10`, set a flag
- When `isDistanceTooFar` is true, show a red warning: "We can't deliver to your location. Delivery is only available within 10km from the restaurant."
- Disable the Pay button when `isDistanceTooFar` is true (add to existing disabled conditions on line 734)
- Add time check: get current IST hour. If hour >= 22 (10 PM), override `deliveryTimeEstimate` to show "Delivery Tomorrow" instead of the calculated time

#### 5. `src/components/Cart.tsx`
- In the Cart page, also check distance and time before allowing "Proceed to Checkout"
- Since Cart doesn't have the delivery address yet, no distance check needed here (it happens at checkout)

#### 6. `src/lib/distanceUtils.ts`
- No changes needed; existing functions suffice

#### 7. `src/components/HomeSellerCard.tsx`
- Remove grayscale on offline sellers' profile photos
- Remove "Online"/"Offline" badge -- or keep it but make it non-blocking

### Technical Details

**Time check (IST):**
```typescript
const now = new Date();
const istHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
const isAfter10PM = istHour >= 22;
```

**Distance check in Checkout:**
```typescript
const isDistanceTooFar = deliveryDistance > 10 && selectedAddress != null;
```

The pay button disabled condition becomes:
```typescript
disabled={isPlacingOrder || cartItems.length === 0 || !isDeliveryStateValid || isDistanceTooFar}
```

