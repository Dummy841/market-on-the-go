
## Plan: Fix Multiple Seller App Issues

### 1. POS Page Fixed Layout (Header & Footer Pinned)
The POS page already uses `h-screen overflow-hidden flex flex-col`, but on Android the safe-area padding on `body` adds extra height causing overflow. Fix by making the POS page account for safe-area insets explicitly, ensuring only the cart area scrolls.

**Files:** `src/pages/SellerPOS.tsx`
- Change root container to use `fixed inset-0` with flex column layout so it fills exactly the viewport regardless of safe-area padding on body.

### 2. Seller OTP Auto-Submit on 4 Digits
Currently the OTP form requires clicking "Verify & Login". Add auto-submit: when `otp.length === 4`, automatically trigger verification.

**Files:** `src/pages/SellerLogin.tsx`
- Add `useEffect` watching `otp` state; when length reaches 4, call `handleVerifyOtp` automatically.

### 3. Receipt: Show Tax Per Item + Fix Status Bar Overlap
The receipt HTML opens in a new window without safe-area meta tag. Add viewport meta and safe-area padding. Also add GST line per item (like the reference image showing "GST (2%) ₹5.00").

**Files:** `src/components/POSCheckoutModal.tsx`, `src/pages/POSTransactions.tsx`
- In the receipt HTML `<head>`, add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` and `padding-top: env(safe-area-inset-top)` on body.
- For each item with `gst_percentage > 0`, add a line showing `GST ({gst_percentage}%) ₹{amount}`.

### 4. Android Back Button from Receipt Page
The receipt opens via `window.open` in a new tab/window, so back button behavior from there is outside app control. However, the `/seller-pos` route needs to be added to the exit pages list OR ensure back navigation works properly. Currently `/seller-pos` is not an exit page and `window.history.back()` should work. The issue is likely that the receipt triggers navigation. Will verify the back button hook includes seller-pos sub-routes properly.

**Files:** `src/hooks/useAndroidBackButton.ts`
- Add `/seller-pos` to exit pages so back from POS goes to exit (or keep it navigating back). The real fix: ensure receipt doesn't push to history. Since receipt uses `window.open`, this should be fine. The issue might be that after checkout completes, there's no history to go back to. Will ensure POS page stays in history.

### 5. Daily Wallet Credits: Exclude POS Orders
The database function `compute_seller_daily_net_earnings` includes ALL delivered orders. Must add filter `AND o.delivery_address != 'POS - In Store'` to exclude POS transactions.

**Database Migration:**
```sql
CREATE OR REPLACE FUNCTION public.compute_seller_daily_net_earnings(
  p_seller_id uuid, p_date date
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Same logic but with added filter:
-- AND o.delivery_address != 'POS - In Store'
-- in both the delivered items query and rejected orders query
$$;
```

### 6. POS Transactions: Single Date Filter + All/Today Buttons + Total Amount
Replace the dual date range with a single date picker, "All" and "Today" quick buttons, and show total amount in the top-right corner.

**Files:** `src/pages/POSTransactions.tsx`
- Replace `dateFrom`/`dateTo` with single `selectedDate` state and an `filterMode` (`'date' | 'all'`).
- Add "Today" button (sets date to today) and "All" button (fetches all).
- Show total amount badge in the header area.

### 7. Hamburger Menu: Fix "My Earnings" to "Online Earnings" and "Transactions" to "POS Transactions"
The `SellerHamburgerMenu` still shows old labels.

**Files:** `src/components/SellerHamburgerMenu.tsx`
- Change `label: 'My Earnings'` to `'Online Earnings'`
- Change `label: 'Transactions'` to `'POS Transactions'`

### Summary of Files to Modify
1. `src/pages/SellerPOS.tsx` - Fixed layout for Android
2. `src/pages/SellerLogin.tsx` - Auto-submit OTP on 4 digits
3. `src/components/POSCheckoutModal.tsx` - Receipt: safe-area + tax per item
4. `src/pages/POSTransactions.tsx` - Receipt fix + single date filter + total amount
5. `src/hooks/useAndroidBackButton.ts` - Back button fix for POS flow
6. `src/components/SellerHamburgerMenu.tsx` - Label fixes
7. **Database migration** - Exclude POS orders from daily wallet earnings function
