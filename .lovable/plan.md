

## Plan: Multiple Fixes - POS Receipts, User UI, Logo, Voice Search, Calls

### 1. POS Transactions - Bilingual Receipts
The POS Transactions page currently has a single "Print" option. Add "Print in English" and "Print in Telugu" options (same as POSCheckoutModal).

**File:** `src/pages/POSTransactions.tsx`
- In the dropdown menu and view dialog, replace single Print button with two options: "Print in English" / "Print in Telugu"
- Fetch `telugu_name` for items from the `items` table when printing in Telugu
- Modify `renderReceipt` to accept a language param and swap item names accordingly

### 2. User Header - Fix Moving Issue & Convert Profile to Sidebar
The header has `sticky top-0` which should be fine, but the uploaded image shows something overlapping on top (possibly the notification banner). The profile dropdown menu should become a slide-in sidebar (Sheet component).

**Files:** `src/components/Header.tsx`
- Replace `DropdownMenu` for authenticated user profile with a `Sheet` (sidebar) from the right side
- Include: user info, My Profile, My Orders, My Wallet (with balance), Help, Logout
- This fixes the dropdown appearing over content and provides a better mobile experience

### 3. Remove "Added to Cart" Toast
**File:** `src/components/HomeProductCard.tsx`
- Remove the `toast()` call after `addToCart()` (lines 55-58)

### 4. Redesign HomeProductCard - MRP, Discount Badge, Quantity Controls, Image Carousel
**Files:** `src/components/HomeProductCard.tsx`, `src/components/HomeProductsGrid.tsx`
- Add `mrp` field to the items query in `HomeProductsGrid.tsx` (currently not fetched)
- Add `seller_item_images` join to get multiple images
- Pass `mrp` and `images` to `HomeProductCard`
- Show discount percentage badge top-left (e.g., "17% OFF") when `mrp > seller_price`
- Show MRP with strikethrough next to seller_price
- Replace ADD button with compact "ADD" button; after adding, show -/qty/+ controls
- Use `ItemImageCarousel` component (already exists with 3s auto-scroll) for product images
- Change auto-scroll interval to 2 seconds

### 5. Zippy Logo on Login/Register/Splash Pages
**Files:** `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`, `src/pages/SellerLogin.tsx`, `src/pages/DeliveryPartnerLogin.tsx`, `src/components/SplashScreen.tsx`
- Copy the uploaded logo (`zippy_new_logo.png`) to `src/assets/`
- Add the logo image above the form title in all login/register dialogs/pages
- In SplashScreen, replace the text-only animation with the logo image + "Zippy" text

### 6. Voice Search - Fuzzy Matching
Currently the search uses `ilike.%query%` which requires exact substring match. "bellam 1kg" won't match "Jaggery 1 kg" or even "Bellam" if the voice search AI extracts different keywords.

**File:** `src/components/HomeProductsGrid.tsx`
- When searching, split the query into words and build an OR filter matching any individual word (2+ chars)
- Example: "bellam 1kg" -> search for items matching `bellam` OR `1kg`
- This ensures partial word matches work better

**File:** `supabase/functions/voice-search-products/index.ts`
- Update AI prompt to also return the original spoken words as keywords alongside extracted product names
- This ensures regional/local names like "bellam" are preserved in search

### 7. Fix Exotel Call - CORS Headers & KYC Issue
The edge function logs show Exotel returns **403 "Your account is not yet KYC compliant"**. This is an Exotel account-level issue that requires completing KYC on the Exotel dashboard. However, the code also has incomplete CORS headers which causes the "non-2xx" error on the client side.

**File:** `supabase/functions/exotel-click-to-call/index.ts`
- Update CORS headers to include all required Supabase client headers: `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`
- The 403 KYC error from Exotel itself cannot be fixed in code - user needs to complete KYC verification on the Exotel dashboard
- Add a more descriptive error message when Exotel returns 403 (KYC not complete)

**Same mobile number issue:** The code sends `from` and `to` as the same number (9502395261 for both user and delivery partner). This is a data issue - the delivery partner assigned to the order has the same mobile as the user. The code correctly uses the order's assigned delivery partner mobile vs. the user's mobile, so this is expected behavior when testing with the same number.

### 8. ItemImageCarousel - Update Auto-scroll to 2 Seconds
**File:** `src/components/ItemImageCarousel.tsx`
- Change interval from 3000ms to 2000ms

### Summary of Files to Modify

| File | Change |
|------|--------|
| `src/pages/POSTransactions.tsx` | Bilingual receipt printing |
| `src/components/Header.tsx` | Profile dropdown → Sheet sidebar |
| `src/components/HomeProductCard.tsx` | Remove toast, add MRP/discount/qty controls/carousel |
| `src/components/HomeProductsGrid.tsx` | Fetch mrp + images, fuzzy word-split search |
| `src/components/ItemImageCarousel.tsx` | 2s auto-scroll |
| `src/components/auth/LoginForm.tsx` | Add Zippy logo |
| `src/components/auth/RegisterForm.tsx` | Add Zippy logo |
| `src/pages/SellerLogin.tsx` | Add Zippy logo |
| `src/pages/DeliveryPartnerLogin.tsx` | Add Zippy logo |
| `src/components/SplashScreen.tsx` | Add Zippy logo |
| `supabase/functions/exotel-click-to-call/index.ts` | Fix CORS headers, better error messages |
| `supabase/functions/voice-search-products/index.ts` | Preserve regional keywords |
| Copy `zippy_new_logo.png` to `src/assets/` | Logo asset |

