
# Implementation Plan: Fix Critical Android Issues

This plan addresses 6 critical issues identified from your screenshots and testing on Android Capacitor app.

---

## Summary of Issues

| # | Issue | Root Cause | Priority |
|---|-------|------------|----------|
| 1 | Order tracking button not showing for "out_for_delivery" orders | OrderTrackingContext checks for `going_for_delivery` but DB uses `out_for_delivery` | Critical |
| 2 | Voice call failing with "createSpan undefined" error | ZEGOCloud SDK not initializing properly - token/SDK issue in Capacitor WebView | Critical |
| 3 | Location picker not responding to touch (drag, zoom, buttons) | Controlled map center conflicts with touch gestures in Capacitor | Critical |
| 4 | Header profile showing rectangle box instead of circle | Button wrapper around Avatar creating rectangular appearance | Medium |
| 5 | Delivery PIN not showing in order tracking modal | PIN display missing from tracking modal when out for delivery | Medium |
| 6 | Tracking button status text not matching exact flow | Status text mapping doesn't match `out_for_delivery` status | Low |

---

## Issue 1: Order Tracking Not Showing for Out for Delivery Orders

**Root Cause:**
In `OrderTrackingContext.tsx` (line 85), the active statuses include `going_for_delivery` but the actual status saved to DB is `out_for_delivery`.

**Solution:**
Add `out_for_delivery` to the active statuses list.

**File: `src/contexts/OrderTrackingContext.tsx`**
```typescript
// Line 85: Add out_for_delivery to active statuses
const activeStatuses = ['pending', 'accepted', 'preparing', 'packed', 'assigned', 'going_for_pickup', 'picked_up', 'going_for_delivery', 'out_for_delivery'];
```

Also update line 116:
```typescript
.in('status', ['pending', 'accepted', 'preparing', 'packed', 'assigned', 'going_for_pickup', 'picked_up', 'going_for_delivery', 'out_for_delivery'])
```

---

## Issue 2: Voice Call Failing with "createSpan undefined" Error

**Root Cause:**
The `ZegoUIKitPrebuilt.create(token)` call is failing because in Capacitor WebView on Android, the SDK has initialization issues. The error "Cannot read properties of undefined (reading 'createSpan')" indicates `ZegoUIKitPrebuilt.create()` returns undefined or fails silently.

**Solution:**
1. Add defensive checks before calling SDK methods
2. Use dynamic import to ensure SDK is loaded
3. Add better error handling with specific messages
4. Ensure the SDK container element exists before joining room

**File: `src/hooks/useZegoVoiceCall.ts`**

Key changes:
- Add null check after `ZegoUIKitPrebuilt.create(token)` 
- Wrap SDK initialization in try-catch with specific error messages
- Delay room join to ensure SDK is ready
- Use dynamic import pattern for Capacitor compatibility

```typescript
// In getToken callback, add validation
const getToken = useCallback(async (roomId: string): Promise<{ token: string; appId: number }> => {
  const zegoUserId = (myId || 'guest')
    .toString()
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 32);

  if (!zegoUserId || zegoUserId.length < 2) {
    throw new Error('Invalid user ID for voice call');
  }

  const { data, error } = await supabase.functions.invoke('get-zego-token', {
    body: { userId: zegoUserId, roomId, userName: myName }
  });

  if (error) throw new Error(error.message || 'Failed to get call token');
  if (!data?.token) throw new Error('No token received from server');
  
  return data;
}, [myId, myName]);

// In startCall, add defensive checks
try {
  const tokenData = await getToken(roomId);
  
  // Defensive check - create ZEGO instance with validation
  let zp;
  try {
    zp = ZegoUIKitPrebuilt.create(tokenData.token);
    if (!zp) {
      throw new Error('Voice call service failed to initialize');
    }
  } catch (sdkError: any) {
    console.error('ZEGO SDK create error:', sdkError);
    throw new Error('Voice call service unavailable. Please try again.');
  }
  
  zegoRef.current = zp;
  // ... rest of logic
} catch (error) {
  // Handle with specific message
}
```

---

## Issue 3: Location Picker Not Responding to Touch on Android

**Root Cause:**
Even with `touchAction: 'auto'` and `gestureHandling: 'greedy'`, the controlled `center` prop on GoogleMap fights with user touch gestures in Capacitor WebViews. The map needs to be fully uncontrolled after initial render.

**Solution:**
1. Never pass `center` prop after initial load - use `ref.panTo()` for programmatic moves
2. Remove `mapContainerStyle` touchAction - let CSS handle it
3. Use `onCenterChanged` or `onDragEnd` to track position instead
4. Add explicit touch handlers on the map container div
5. Ensure `gestureHandling: 'cooperative'` for mobile

**File: `src/components/FullScreenLocationPicker.tsx`**

Major changes:
- Remove controlled `center={...}` prop entirely after initial position
- Use `defaultCenter` instead of `center`
- Add `onCenterChanged` callback to track map movement
- Set map container with `touch-action: none` to let Google Maps handle all touch
- Use `requestAnimationFrame` for smoother updates

```tsx
// Remove center prop - use only for initial render once
// After first render, let the map be fully uncontrolled

<GoogleMap
  mapContainerClassName="w-full h-full absolute inset-0"
  mapContainerStyle={{ 
    width: '100%',
    height: '100%',
  }}
  // Don't use center after map loads - this causes touch conflicts
  defaultCenter={initialCenter}
  zoom={17}
  onLoad={handleMapLoad}
  onUnmount={handleMapUnmount}
  onIdle={handleMapIdle}
  onCenterChanged={handleCenterChanged}
  options={{
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
    draggable: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
  }}
/>
```

Also wrap the entire map container in a div that prevents parent touch interference:
```tsx
<div 
  className="flex-1 relative"
  style={{ 
    overflow: 'hidden',
    WebkitOverflowScrolling: 'touch',
  }}
>
```

---

## Issue 4: Header Profile Showing Rectangle Instead of Circle

**Root Cause:**
Looking at the Header component around line 389-397, the Avatar is wrapped in a Button with `px-3` padding that creates the rectangular appearance. The dropdown trigger button has visible borders.

**Solution:**
Adjust the DropdownMenuTrigger button styling to be circular when showing just the avatar on mobile.

**File: `src/components/Header.tsx`**

```tsx
// Around line 388-403
<DropdownMenuTrigger asChild>
  <Button 
    variant="ghost" 
    className="flex items-center space-x-2 h-10 px-2 md:px-3 rounded-full"
  >
    <div className={`relative ${hasActivePass ? 'p-0.5 rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500' : ''}`}>
      <Avatar className={`h-8 w-8 ${hasActivePass ? 'border-2 border-background' : ''}`}>
        <AvatarImage src={user?.profile_photo_url || ''} alt={user?.name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
    </div>
    {/* Only show on desktop */}
    <div className="hidden md:flex flex-col items-start">
      <span className="text-sm font-medium">{user?.name}</span>
      <span className="text-xs text-muted-foreground">{user?.mobile}</span>
    </div>
    <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
  </Button>
</DropdownMenuTrigger>
```

Key change: Add `rounded-full` and hide the ChevronDown on mobile with `hidden md:block`.

---

## Issue 5: Show Delivery PIN in Order Tracking Modal

**Root Cause:**
The Order Tracking Modal doesn't display the delivery PIN when the order is out for delivery.

**Solution:**
Add a delivery PIN display section in the tracking modal, similar to how it's shown in MyOrders page.

**File: `src/components/OrderTrackingModal.tsx`**

Add after the status card section (around line 435):
```tsx
{/* Delivery PIN - Show when out for delivery */}
{(activeOrder.status === 'out_for_delivery' || 
  activeOrder.pickup_status === 'going_for_delivery' ||
  activeOrder.pickup_status === 'picked_up') && 
  activeOrder.delivery_pin && (
  <Card className="p-4 bg-green-50 border-green-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-green-700 font-medium">Delivery PIN</p>
        <p className="text-xs text-green-600">Share this PIN with delivery partner</p>
      </div>
      <div className="text-2xl font-bold text-green-700">
        {activeOrder.delivery_pin}
      </div>
    </div>
  </Card>
)}
```

---

## Issue 6: Tracking Button Status Text Mapping

**Root Cause:**
The `getStatusText()` function in OrderTrackingButton checks for `going_for_delivery` but the actual status is `out_for_delivery`.

**Solution:**
Update the status mapping to include `out_for_delivery`.

**File: `src/components/OrderTrackingButton.tsx`**

```typescript
const getStatusText = () => {
  const status = activeOrder.status;
  const sellerStatus = (activeOrder as any).seller_status;
  const pickupStatus = (activeOrder as any).pickup_status;

  if (status === 'delivered') return 'Delivered';
  // Add out_for_delivery to the check
  if (pickupStatus === 'picked_up' || 
      pickupStatus === 'going_for_delivery' || 
      status === 'going_for_delivery' ||
      status === 'out_for_delivery') {
    return 'Out for Delivery';
  }
  if (sellerStatus === 'packed') return 'Packed';
  if (sellerStatus === 'accepted' || sellerStatus === 'preparing') return 'Accepted';
  return 'Placed';
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/OrderTrackingContext.tsx` | Add `out_for_delivery` to active statuses |
| `src/hooks/useZegoVoiceCall.ts` | Add defensive SDK checks and better error handling |
| `src/components/FullScreenLocationPicker.tsx` | Remove controlled center, use defaultCenter |
| `src/components/Header.tsx` | Add `rounded-full`, hide chevron on mobile |
| `src/components/OrderTrackingModal.tsx` | Add delivery PIN display section |
| `src/components/OrderTrackingButton.tsx` | Add `out_for_delivery` to status mapping |

---

## Technical Notes

**Voice Call SDK Issue:**
The ZEGOCloud SDK can fail in Capacitor WebViews due to:
- Missing WebRTC permissions in the native layer
- Token validation issues
- SDK not fully loaded before use

The defensive checks and error handling will provide better user feedback when the SDK fails.

**Location Picker Touch Issue:**
Google Maps in React requires careful handling of the `center` prop. When `center` is controlled (passed on every render), it can conflict with touch gestures because React keeps trying to reset the position. Using `defaultCenter` instead of `center` after initial load allows the map to be fully controlled by touch.

---

## Implementation Order

1. Fix order tracking status check (quick fix)
2. Fix tracking button status text (quick fix)
3. Add delivery PIN to tracking modal
4. Fix header profile styling
5. Improve voice call error handling
6. Fix location picker touch handling
