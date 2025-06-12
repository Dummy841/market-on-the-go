
export interface Farmer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  date_joined: string;
  products?: Product[];
  transactions?: Transaction[];
  email: string;
  password: string;
  profile_photo?: string;
  state?: string;
  district?: string;
  village?: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  category: string;
  created_at: string;
  updated_at: string;
  farmer_id?: string;
  barcode?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: Date;
  type: 'credit' | 'debit';
  description: string;
  farmerId: string;
  settled: boolean;
  paymentMode?: 'Cash' | 'Online';
}

export interface DailyEarning {
  date: string;
  amount: number;
}

export interface MonthlyEarning {
  month: string;
  amount: number;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  unit: string;
  category: string;
  farmerId: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  address?: string | null;
  pincode?: string | null;
  date_joined: string;
  profile_photo?: string | null;
  password: string;
  created_at: string;
  updated_at: string;
}

// Order Management types
export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'placed' | 'packed' | 'shipping' | 'delivered' | 'cancelled';
  date: string;
  trackingInfo?: string;
  estimatedDelivery?: string;
  paymentMethod?: 'cash' | 'online';
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

// Coupon system types
export interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscountLimit?: number;
  expiryDate: Date;
  targetType?: 'all' | 'customer' | 'employee';
  targetUserId?: string;
}

// Role-based access control types - updated to match Supabase schema
export type Role = string;

export interface Permission {
  resource: string;
  actions: ('view' | 'create' | 'edit' | 'delete')[];
}

export interface RolePermission {
  role: Role;
  permissions: Permission[];
}

// Updated Role interface to match Supabase schema
export interface RoleData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  profilePhoto?: string;
  dateJoined: Date;
  state?: string;
  district?: string;
  village?: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
}

// Ticket system types
export interface Ticket {
  id: string;
  userId: string;
  userType: 'farmer' | 'customer';
  userName: string;
  userContact: string;
  message: string;
  status: 'pending' | 'in-review' | 'closed';
  dateCreated: Date;
  lastUpdated: Date;
  attachmentUrl?: string;
  resolution?: string;
  assignedTo?: string;
}
