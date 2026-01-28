
## Implementation Plan

Based on your requirements, I'll implement three features:

---

### Feature 1: Multi-Category Selection for Sellers

**Current State:** The seller creation form only allows selecting a single category (food_delivery, instamart, dairy, or services).

**Goal:** Allow sellers to belong to multiple categories at once.

**Changes Required:**

1. **Database Schema Update:**
   - The current `category` column stores a single text value
   - Will add a new `categories` text column to store comma-separated values (similar to how `subcategory` works)
   - Keep the old `category` column for backward compatibility

2. **CreateSellerForm.tsx:**
   - Replace the single-select dropdown with a multi-select checkbox list
   - Store selected categories as comma-separated string in the new `categories` column
   - Update form schema to support array of categories

3. **EditSellerModal.tsx:**
   - Same changes as CreateSellerForm - convert to multi-select checkboxes
   - Parse existing categories on load
   - Save as comma-separated string

4. **FeaturedRestaurants.tsx:**
   - Update the query to check if the category filter is contained within the seller's `categories` field
   - Use SQL `LIKE` or array contains logic

---

### Feature 2: Update Index Page Layout for Instamart and Dairy

**Current State:** The Index page shows module cards (INSTAMART, DAIRY PRODUCTS, etc.) in a 2-column grid via `ServiceCategories` component.

**Goal:** Remove module cards and directly show the items/sellers from Instamart and Dairy categories on the home page.

**Changes Required:**

1. **Index.tsx:**
   - Replace `ServiceCategories` component with a new layout
   - Add two sections: "Instamart" and "Dairy Products"
   - Each section will show sellers from that category

2. **Create new component (or modify ServiceCategories.tsx):**
   - Show a horizontal scrollable list of Instamart sellers
   - Show a horizontal scrollable list of Dairy sellers
   - Each card links to the seller's menu page
   - Use similar card style to `RestaurantCard` but simpler

---

### Feature 3: "Coming Soon" Message for Inactive Modules

**Current State:** When a module is inactive (like `food_delivery` with `is_active: false`), clicking on "Food" in the bottom nav shows "No sellers found in this category within 10km of your location".

**Goal:** Show a "Coming Soon" message instead of the "no sellers" message when the module is inactive.

**Changes Required:**

1. **FeaturedRestaurants.tsx:**
   - Fetch module status from `service_modules` table
   - Check if the current category's module is active
   - If inactive, display a "Coming Soon" UI instead of fetching sellers

2. **UI Design:**
   - Centered "Coming Soon" message with an icon
   - Informative text like "This service will be available soon in your area"

---

### Technical Summary

| File | Changes |
|------|---------|
| `supabase/migrations/` | Add `categories` column to sellers table |
| `src/components/CreateSellerForm.tsx` | Multi-select checkboxes for categories |
| `src/components/EditSellerModal.tsx` | Multi-select checkboxes for categories |
| `src/pages/Index.tsx` | New layout with Instamart and Dairy sections |
| `src/components/ServiceCategories.tsx` | Remove or repurpose for new layout |
| `src/components/FeaturedRestaurants.tsx` | Check module active status, show "Coming Soon" |
| `src/contexts/SellerAuthContext.tsx` | Update Seller interface if needed |
| `src/integrations/supabase/types.ts` | Will auto-update with new column |

---

### Implementation Order

1. Database migration for `categories` column
2. Update seller forms for multi-category selection
3. Update FeaturedRestaurants to check module status and show "Coming Soon"
4. Update Index page with new Instamart/Dairy direct listing layout
