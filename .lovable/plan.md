

## Plan: POS Transactions Page, Payment Flow Improvements, and RLS Fix

### Issues Identified

1. **Transactions is a modal** — needs to be a standalone page at `/seller-pos/transactions`
2. **3-dot actions not rendering** — DropdownMenu inside Dialog has portal/z-index issues; moving to a page fixes this
3. **Payment method behavior** — Quick Pay should complete immediately + auto-print; UPI should show QR then complete; Card should show transaction ID input then complete
4. **RLS error on order insert** — The INSERT policy on `orders` requires `user_id` to exist in the `users` table. Walk-in customers use UUID `00000000-0000-0000-0000-000000000000` which doesn't exist in `users`, causing the violation

### Changes

**1. New page: `src/pages/POSTransactions.tsx`**
- Convert `POSTransactionsModal` content into a full page with back navigation to `/seller-pos`
- Header with "POS Transactions" title and back arrow
- Date filters and table with 3-dot actions (View dialog, Print) — no longer inside a Dialog so DropdownMenu will work correctly
- Reuse the existing receipt print logic and view order dialog

**2. Update `src/App.tsx`**
- Add route: `/seller-pos/transactions` → `POSTransactions`

**3. Update `src/pages/SellerPOS.tsx`**
- Change Transactions button to `navigate('/seller-pos/transactions')` instead of opening modal
- Remove `POSTransactionsModal` import and usage

**4. Update `src/components/POSCheckoutModal.tsx`**
- **Quick Pay (cash)**: On click, immediately call `handleCompletePayment('cash')` — no separate "Pay" button needed. Auto-print receipt after success.
- **UPI**: On click, show a QR placeholder/instruction area with a "Complete Payment" button. On complete, auto-print receipt.
- **Card**: On click, show a transaction ID input field with a "Complete Payment" button. On complete, auto-print receipt.
- Add receipt print logic (reuse from POSTransactionsModal) to auto-print after every successful payment.
- Pass `sellerName` to receipt renderer.

**5. Fix RLS error**
- Add a SQL migration to insert a walk-in customer row into `users` table with id `00000000-0000-0000-0000-000000000000`, name `Walk-in Customer`, mobile `N/A` — so the RLS policy is satisfied
- Use `ON CONFLICT DO NOTHING` to be idempotent

**6. Delete `src/components/POSTransactionsModal.tsx`** — no longer needed

### Technical Details
- Receipt auto-print: after successful order insert, construct receipt HTML and open print window immediately
- The order insert RLS policy checks `user_id IN (SELECT id FROM users WHERE id = orders.user_id)` — the walk-in UUID must exist as a row in `users`

