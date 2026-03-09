

## Plan: Add Terms & Conditions to Registration Flow

### What needs to be built

1. **New Supabase table `terms_conditions`** to store T&C points added by admin
   - Columns: `id`, `content` (text), `display_order` (integer), `is_active` (boolean), `created_at`, `updated_at`

2. **New admin dashboard page `TermsConditions.tsx`** under Online Management
   - Table view showing all T&C entries with content and order
   - Add, edit, delete T&C points
   - Toggle active/inactive

3. **Add sidebar menu item** in `DashboardSidebar.tsx` under "Online Mgmt" group: "Terms & Conditions"

4. **Add route** in `App.tsx` for `/dashboard/terms-conditions`

5. **Update `RegisterForm.tsx`**:
   - Fetch active T&C entries from `terms_conditions` table ordered by `display_order`
   - Display a checkbox with "I agree to Terms & Conditions" label
   - When checkbox is clicked, show a dialog/expandable section listing all T&C points one by one
   - "Send OTP" button remains **disabled** until the checkbox is checked
   - Add `agreedToTerms` state, reset on form reset

### Technical Details

- **Table creation**: Via Supabase migration
- **RLS**: Admin can manage all; anyone can read active entries
- **RegisterForm changes**: Add state `agreedToTerms`, fetch terms on mount, show terms in a scrollable dialog, disable Send OTP button with `disabled={isLoading || !agreedToTerms}`
- **Admin page pattern**: Follow existing patterns from `Banners.tsx` or `Modules.tsx` (table + CRUD)

### Files to create/modify
- Create: `src/pages/dashboard/TermsConditions.tsx`
- Modify: `src/components/DashboardSidebar.tsx` (add menu item)
- Modify: `src/App.tsx` (add route)
- Modify: `src/components/auth/RegisterForm.tsx` (add checkbox + terms display)
- Supabase migration for `terms_conditions` table

