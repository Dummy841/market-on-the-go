

# Admin Login & Employee Management System

## Overview
Create a secure admin login system with mobile + password authentication, and an employee management module for managing admin panel access.

## Database Changes

### 1. New `admin_employees` table
```sql
CREATE TABLE public.admin_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  email text,
  profile_photo_url text,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'employee', -- 'admin', 'employee', 'manager', etc.
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to admin_employees" ON public.admin_employees FOR ALL USING (true) WITH CHECK (true);
```

### 2. Seed initial admin account
- Mobile: `9502395261`
- Role: `admin`
- Password: Auto-generated strong password (e.g., `Zippy@Admin2026!`) using `hash_password()` function (already exists in DB)

## New Pages & Components

### 1. Admin Login Page (`/admin-login`)
- Mobile number input (10-digit Indian validation)
- Password input with show/hide toggle
- Password validation: must contain uppercase, lowercase, number, and special character
- On success: store admin session in localStorage (`adminEmployee` object + session token) and redirect to `/dashboard`
- Verify credentials using `verify_password()` DB function (already exists)

### 2. Admin Auth Context (`AdminAuthContext.tsx`)
- Manages admin employee session state
- `login(mobile, password)` — verifies against `admin_employees` table
- `logout()` — clears session
- Wraps the Dashboard route to protect it

### 3. Dashboard Route Protection
- Wrap `/dashboard` route with admin auth check
- If not logged in, redirect to `/admin-login`

### 4. Employee Management Page (`/dashboard/employees`)
- Table listing all employees: name, mobile, email, role, status, actions
- "Add Employee" button opens a form dialog with fields:
  - Employee Name (required)
  - Mobile (required, Indian validation)
  - Email (optional)
  - Profile Photo (upload to `seller-profiles` bucket)
  - Password (required, alphanumeric + special char validation)
  - Role (select: admin, manager, employee)
- Edit/deactivate employees from the table
- Employees can change their own password via a button in the dashboard header

### 5. Change Password in Dashboard Header
- Add logged-in employee name + "Change Password" option in the dashboard header
- Reuse the existing `ChangePasswordModal` pattern but adapted for `admin_employees` table

## Sidebar Changes
- Add "Employee Management" as a sub-item under the existing "Sellers" top-level item, OR as a new standalone item after Sellers
- Route: `/dashboard/employees`

## Routing Changes (`App.tsx`)
- Add `/admin-login` route
- Add `/dashboard/employees` nested route
- Protect `/dashboard` with admin auth

## Security Notes
- Passwords hashed server-side using existing `hash_password()` function
- Verification via existing `verify_password()` function
- Session stored in localStorage with admin employee data (no Supabase Auth involved, consistent with seller auth pattern)

## Initial Credentials
After implementation, the admin account will be:
- **Mobile**: 9502395261
- **Password**: `Zippy@Admin2026!` (must change after first login)

