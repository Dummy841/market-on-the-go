

# Employee Form Page with Granular Dashboard Access Permissions

## What We're Building

1. **Separate Add/Edit Employee page** instead of a dialog — navigates to `/dashboard/employees/add` and `/dashboard/employees/:id/edit`
2. **Remove the "Role" field** from the form
3. **Add "Dashboard Access" section** with collapsible permission groups and checkboxes matching the handwritten spec
4. **Hide superadmin (9502395261)** from the employee table
5. **Revenue pages (Online & Wholesale) are superadmin-only** — never shown to employees
6. **Enforce access**: Sidebar only shows items the employee has access to; routes redirect if unauthorized

## Database Changes

Add a `permissions` jsonb column to `admin_employees`:

```sql
ALTER TABLE public.admin_employees 
ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;
```

## Permissions Structure (stored as JSON)

```json
{
  "users": { "view": true, "view_profile": true, "view_orders": true, "wallet_topup": true, "export": true },
  "sellers": { "view": true, "create": true, "view_details": true, "edit": true, "view_sales": true, "view_settlements": true },
  "employees": { "view": true, "edit": true, "create": true },
  "orders": { "view": true, "online": true, "pos": true, "update": true },
  "settlements": { "view": true, "update": true },
  "refunds": { "view": true },
  "delivery_partners": { "view": true, "create": true, "edit": true, "update": true },
  "banners": { "view": true, "create": true, "edit": true, "delete": true },
  "modules": { "view": true, "create": true, "edit": true, "delete": true },
  "subcategories": { "view": true, "create": true, "edit": true, "delete": true },
  "support_chats": { "view": true, "update": true },
  "wholesale_inventory": { "view": true, "create": true, "edit": true },
  "wholesale_orders": { "view": true, "update": true },
  "production": { "view": true, "edit": true, "create": true }
}
```

## New Files

### 1. `src/pages/dashboard/EmployeeForm.tsx`
- Full-page form with employee details (name, mobile, email, photo, password)
- "Dashboard Access" section with collapsible groups (Users, Sellers, Employees, Orders, etc.)
- Each group has a header with a toggle-all checkbox and individual sub-permission checkboxes
- On save, stores permissions JSON in `admin_employees.permissions`
- For edit mode, loads existing employee data and pre-checks permissions

## Modified Files

### 2. `src/pages/dashboard/Employees.tsx`
- Remove the dialog form entirely
- "Add Employee" button navigates to `/dashboard/employees/add`
- Edit button navigates to `/dashboard/employees/:id/edit`
- Filter out superadmin (mobile `9502395261`) from the table
- Remove the "Role" column from the table

### 3. `src/App.tsx`
- Add routes: `/dashboard/employees/add` and `/dashboard/employees/:id/edit`

### 4. `src/contexts/AdminAuthContext.tsx`
- Add `permissions` to the `AdminEmployee` interface
- Store permissions in localStorage on login
- Add helper: `hasPermission(section, action)` — returns true for superadmin always

### 5. `src/components/DashboardSidebar.tsx`
- Filter menu items based on `admin.permissions`
- Hide Revenue and Wholesale Revenue entirely (superadmin-only)
- Show Employee Management only if `employees.view` is true
- Each sidebar item checks if the employee has at least `view` permission for that section

### 6. `src/pages/Dashboard.tsx`
- Wrap `<Outlet>` routes with permission checks — redirect to `/dashboard` if employee lacks access to the current route

## Superadmin Rules
- Mobile `9502395261` is treated as superadmin in code
- Always has full access to everything including Revenue pages
- Never appears in the employee table
- Cannot be edited or deactivated by other employees

