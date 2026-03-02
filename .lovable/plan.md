

## Plan: Seller Access Type (Online Orders / POS) with Navigation Filtering

### Overview
Add two checkboxes (Online Orders, POS) to the Create Seller and Edit Seller forms in the admin dashboard. Based on the selection, filter the navigation items visible to the seller in their dashboard.

### Access Rules

```text
Selection         | Visible Nav Items
------------------|--------------------------------------------------
Online Only       | Add Items, My Menu, Shop Wholesale, Online Orders, My Orders, Wallet
POS Only          | Add Items, My Menu, Shop Wholesale, My Orders, Settings, Transactions
Both              | All items (Add Items, My Menu, Online Orders, My Earnings, Shop Wholesale, POS, Transactions, Settings, My Orders, Wallet)
Neither           | Shop Wholesale, My Orders only
```

### Step 1: Database Migration
Add a `seller_type` column to the `sellers` table:
- Type: `text`, nullable, default `null`
- Values: `'online'`, `'pos'`, `'both'`, or `null` (neither)

### Step 2: Update CreateSellerForm.tsx
- Add two checkbox inputs: "Online Orders" and "POS"
- Map selections to `seller_type` value (`'online'`, `'pos'`, `'both'`, or `null`)
- Save to `sellers` table on submit

### Step 3: Update EditSellerModal.tsx
- Same two checkboxes, pre-populated from `seller.seller_type`
- Save updated value on submit

### Step 4: Update Seller Interface
- Add `seller_type?: string | null` to `Seller` interface in `SellerAuthContext.tsx`

### Step 5: Update SellerDashboard.tsx
- Read `seller.seller_type` and filter `navItems` accordingly before rendering
- Logic:
  - `'both'` → show all
  - `'online'` → show: add, menu, wholesale, orders, wholesale-orders, wallet
  - `'pos'` → show: add, menu, wholesale, wholesale-orders, settings, transactions
  - `null`/undefined → show: wholesale, wholesale-orders only

