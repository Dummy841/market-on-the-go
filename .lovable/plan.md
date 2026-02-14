

## Plan: Fix Back Button & Map Touch Responsiveness

### Problem 1: Back Button Closes App
The `FullScreenLocationPicker` is rendered as a full-screen overlay (not a route), so the Android back button handler in `useAndroidBackButton` sees the route as `/` and calls `App.exitApp()`. The fix is to expose a global flag when the location picker is open, and check it in the back button handler to close the picker instead of exiting.

### Problem 2: Map Not Responding to Touch Immediately
The root cause is twofold:
- The `mapInitialized` state is set with a `setTimeout(..., 100)` delay, during which the `center` prop keeps being passed as a controlled value. This fights with touch gestures.
- The `center` prop pattern (`center={mapInitialized ? undefined : initialCenterRef.current}`) causes React to re-render the map, which can interfere with Google Maps' internal touch handling in a Capacitor WebView.

---

### Technical Changes

**1. `src/components/FullScreenLocationPicker.tsx`**
- Add a global event listener for the Android back button by dispatching/listening to a custom `locationPickerBack` event, or simpler: set a `window.__locationPickerOpen` flag and a `window.__locationPickerClose` callback.
- Remove the `setTimeout` delay in `handleMapLoad` -- set `mapInitialized` immediately.
- Switch from controlled `center` prop to `defaultCenter` pattern: pass center only via `onLoad` using `map.setCenter()`, then never pass `center` prop again. This prevents React re-renders from interfering with Google Maps touch handling.
- Remove the conditional `center={mapInitialized ? undefined : initialCenterRef.current}` which causes re-render thrashing.

**2. `src/hooks/useAndroidBackButton.ts`**
- Before checking `location.pathname === '/'`, check if `window.__locationPickerOpen` is true. If so, call `window.__locationPickerClose()` instead of exiting the app.
- This ensures the back button closes the location picker overlay first.

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useAndroidBackButton.ts` | Check for location picker overlay before exiting app |
| `src/components/FullScreenLocationPicker.tsx` | Set global flag when open; remove setTimeout delay; use `onLoad` to set center instead of controlled `center` prop |

