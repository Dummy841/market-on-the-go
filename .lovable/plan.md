

## Plan: Wholesale Order Rejection Flow with Payment Proof Re-upload

### Changes Overview

**1. Admin: Reject with Remarks Modal (`src/pages/dashboard/WholesaleOrders.tsx`)**
- When admin clicks the reject (X) button, instead of immediately rejecting, open a modal with a textarea for remarks and a Submit button
- On submit, update the order with `payment_status: 'rejected'` and `admin_notes: <remarks>`
- Add state for `rejectOrder` and `rejectRemarks`

**2. Seller: Show Rejection Remarks + Upload Proof Button (`src/pages/SellerWholesale.tsx`)**
- On the order card, when `payment_status === 'rejected'`, display the `admin_notes` (rejection remarks) in a red alert box
- Show an "Upload Payment Proof" button on rejected orders
- Clicking it opens a modal with: transaction ID input, file upload, and submit button
- On submit, upload the file to storage, update the order's `payment_proof_url`, `upi_transaction_id`, and reset `payment_status` back to `'pending'` so it appears for admin verification again

**3. Admin Sidebar Badge Fix (`src/components/DashboardSidebar.tsx`)**
- Change the query filter from `in("order_status", ["pending", "verified"])` to also exclude rejected payment orders
- Specifically: count orders where `order_status` is `pending` or `verified` AND `payment_status` is NOT `rejected`
- This ensures rejected orders don't inflate the badge count

### Technical Details

**Admin Reject Modal** (new state + Dialog in WholesaleOrders.tsx):
- `rejectOrder: WholesaleOrder | null` — tracks which order is being rejected
- `rejectRemarks: string` — the remarks text
- Replace the direct `updateOrder(order.id, { payment_status: 'rejected' })` call with `setRejectOrder(order)`
- Modal contains Textarea + Submit button that calls `updateOrder(order.id, { payment_status: 'rejected', admin_notes: rejectRemarks })`

**Seller Upload Proof Modal** (new state + Dialog in SellerWholesale.tsx orders view):
- `proofOrder: WholesaleOrder | null` — which order to upload proof for
- `proofFile: File | null`, `proofTxnId: string` — form state
- On submit: upload image to `wholesale-images` bucket, then update order with new `payment_proof_url`, `upi_transaction_id`, and `payment_status: 'pending'`
- Show admin rejection remarks (`admin_notes`) on the order card in a red box

**Sidebar Badge Query Fix** (DashboardSidebar.tsx):
- Add `.neq("payment_status", "rejected")` to the count query so rejected-payment orders are excluded from the badge

