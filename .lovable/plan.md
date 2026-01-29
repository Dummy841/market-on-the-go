

## Implementation Plan

Based on your requirements, I will implement 4 major features to transform the home page into a product-centric experience with voice search capability.

---

### Feature 1: Remove Modules and Show Products Directly on Home Page

**Current State:** The Index page shows module cards (INSTAMART, DAIRY PRODUCTS) via `ServiceCategories` component, then seller cards via `HomeCategorySellers`.

**Goal:** Remove module cards entirely. Show products from all active modules directly on the home page in a 2-column grid layout with product cards (image, name, price, ADD button).

**Changes Required:**

1. **Index.tsx:**
   - Remove `ServiceCategories` component import and usage
   - Add a new component `HomeProductsGrid` that fetches products from all active modules' sellers
   - Display products in 2-column grid (like the reference image)
   - Each product card shows: image, name, price, +ADD button
   - Products grouped by category/seller with section headers

2. **Create new component `HomeProductsGrid.tsx`:**
   - Fetch all active modules from `service_modules` table
   - For each active module category, fetch sellers and their items
   - Display items in a 2-column responsive grid
   - Each item card: product image, item name, price (in yellow badge), info icon (if item_info exists), +ADD button (green)
   - Filter by user location (within 10km radius)
   - Sort by distance and online status

---

### Feature 2: Sticky Search Bar After Banner (Scrolls with Content)

**Current State:** `UniversalSearchBar` exists but is not prominently placed and the banner is fixed.

**Goal:** Banner should scroll up with content. After banner, show a sticky search bar that allows searching by item name, description, or seller name. When seller is found, show a card with "View" button.

**Changes Required:**

1. **Index.tsx:**
   - Add a new search section immediately after `HomeBanner`
   - Create a new `HomeSearchBar` component with:
     - Input field: "Search items, products, sellers..."
     - Voice search button (microphone icon)
   - Search results dropdown showing:
     - **Products:** Direct product cards with ADD button
     - **Sellers:** Seller card with avatar, name, owner, "View" button

2. **Create new component `HomeSearchBar.tsx`:**
   - Search input with icon
   - Real-time search as user types
   - Results categorized:
     - Items: Show product cards with ADD functionality
     - Sellers: Show seller card with "View" button that navigates to seller's product list
   - When "View" clicked on seller: Navigate to a filtered view showing all that seller's products
   - Integration point for voice search (Feature 4)

3. **Update layout:**
   - Remove fixed positioning from banner
   - Banner scrolls with content naturally
   - Search bar appears right after banner

---

### Feature 3: Seller Products View (When Clicking "View" on Seller)

**Current State:** When clicking a seller, it navigates to `/restaurant/:id` which shows the full restaurant menu page with header, restaurant info, etc.

**Goal:** When clicking "View" on a searched seller in the home page, show a compact view with the seller card and all their products in a 2-column grid (like the reference image 3).

**Changes Required:**

1. **Option A - Keep existing navigation:**
   - The current `/restaurant/:id` page already shows seller products
   - This flow already works, just needs UI refinement

2. **Option B - Inline expansion (recommended):**
   - When "View" is clicked, expand the seller card inline to show their products
   - Products displayed in 2-column grid below the seller info
   - This provides a seamless experience without navigation

   Implementation:
   - Add state in `HomeSearchBar` to track "expanded seller"
   - When expanded, fetch and display seller's items
   - Show items in 2-column grid with ADD buttons

---

### Feature 4: Voice Search with AI Product Suggestions

**Current State:** No voice search or AI integration exists.

**Goal:** After user login, request microphone permission. When user speaks, use AI to understand what they want and suggest matching products from the database.

**Changes Required:**

1. **Request microphone permission after login:**
   - In `UserAuthContext.tsx` or `Index.tsx`, after successful login:
     - Check if permission already granted
     - If not, request microphone permission
     - Store permission status

2. **Create Voice Search Hook `useVoiceSearch.ts`:**
   - Use Web Speech API (`SpeechRecognition`) for speech-to-text
   - Capture user's spoken query
   - Send to backend for AI processing

3. **Create Edge Function `voice-search-products/index.ts`:**
   - Receive transcribed text
   - Use Lovable AI (gemini-3-flash-preview) to:
     - Understand user intent
     - Extract product keywords
     - Match against database items
   - Return matched products

4. **Integrate with `HomeSearchBar`:**
   - Add microphone button
   - When clicked, start listening
   - Show visual feedback (listening indicator)
   - When speech detected, process through AI
   - Display matching products

5. **AI Prompt Design:**
   - System prompt: "You are a product matching assistant. Given a user's spoken request, extract product keywords and categories they might be looking for."
   - Tool calling to return structured output: `{ keywords: string[], category?: string }`

---

### Feature 5: Fix Razorpay UPI Intent Flow on Android

**Current State:** Despite previous configuration, UPI apps are not showing and it defaults to "Enter UPI ID" input.

**Root Cause Analysis:** The Razorpay configuration might not be correctly forcing intent flow on Android. The `method` object needs restructuring.

**Changes Required:**

1. **Update `Checkout.tsx` and `ZippyPassModal.tsx`:**
   - Restructure the Razorpay options to properly force UPI intent
   - Add explicit `external` configuration for UPI apps
   - Use `prefill` with VPA if available
   - Add proper handling for intent callback

2. **Key Configuration Changes:**
```javascript
// Force intent-only for UPI
options.config = {
  display: {
    blocks: {
      upi: {
        name: "Pay via UPI",
        instruments: [{
          method: "upi",
          flows: ["intent"]
        }]
      }
    },
    sequence: ["block.upi"],
    preferences: {
      show_default_blocks: true
    }
  }
};

// Remove method object which might override config
// Add external handler for native apps
options.external = {
  wallets: ['phonepe', 'gpay', 'paytm']
};
```

3. **Add fallback handling:**
   - If intent fails, show toast with instructions
   - Provide manual UPI ID option as secondary

---

### Technical Summary

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove ServiceCategories, add HomeSearchBar, add HomeProductsGrid |
| `src/components/HomeSearchBar.tsx` | New: Search bar with voice integration |
| `src/components/HomeProductsGrid.tsx` | New: 2-column product grid from all active modules |
| `src/components/HomeProductCard.tsx` | New: Individual product card component |
| `src/components/HomeSellerCard.tsx` | New: Seller card with View button for search results |
| `src/hooks/useVoiceSearch.ts` | New: Voice recognition hook |
| `supabase/functions/voice-search-products/index.ts` | New: AI-powered product matching |
| `src/pages/Checkout.tsx` | Update Razorpay UPI configuration |
| `src/components/ZippyPassModal.tsx` | Update Razorpay UPI configuration |
| `src/contexts/UserAuthContext.tsx` | Add microphone permission request after login |

---

### Implementation Order

1. **Phase 1 - Home Page Redesign:**
   - Create `HomeProductsGrid` component
   - Create `HomeProductCard` component  
   - Update `Index.tsx` to remove modules and show products

2. **Phase 2 - Search Functionality:**
   - Create `HomeSearchBar` component
   - Create `HomeSellerCard` component
   - Implement search with results dropdown
   - Add seller expansion with products view

3. **Phase 3 - Voice Search:**
   - Create `useVoiceSearch` hook
   - Create `voice-search-products` edge function
   - Add microphone permission request after login
   - Integrate voice search with search bar

4. **Phase 4 - Razorpay Fix:**
   - Update Checkout.tsx configuration
   - Update ZippyPassModal.tsx configuration
   - Test on Android device

