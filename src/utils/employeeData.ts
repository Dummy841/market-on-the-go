import { Employee, Product, Coupon, RolePermission } from './types';

// Re-export Employee type for convenience using proper TypeScript syntax
export type { Employee } from './types';

// Initial employees data
export const initialEmployees: Employee[] = [
  {
    id: 'emp-001',
    name: 'Admin User',
    email: 'admin@agripay.com',
    phone: '9876543210',
    password: 'admin123',
    role: 'admin',
    dateJoined: new Date('2024-01-01'),
    state: 'Karnataka',
    district: 'Bangalore',
    village: 'Bangalore Urban'
  },
  {
    id: 'emp-002',
    name: 'Manager User',
    email: 'manager@agripay.com',
    phone: '9876543211',
    password: 'manager123',
    role: 'manager',
    dateJoined: new Date('2024-01-15'),
    state: 'Karnataka',
    district: 'Mysore',
    village: 'Mysore City'
  },
  {
    id: 'emp-003',
    name: 'Sales Executive',
    email: 'sales@agripay.com',
    phone: '9876543212',
    password: 'sales123',
    role: 'sales_executive',
    dateJoined: new Date('2024-02-01'),
    state: 'Karnataka',
    district: 'Tumkur',
    village: 'Tumkur City'
  }
];

// Role permissions configuration
export const rolePermissions: RolePermission[] = [
  {
    role: 'admin',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'farmers', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'products', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'sales', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'transactions', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'coupons', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'employees', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'tickets', actions: ['view', 'create', 'edit', 'delete'] }
    ]
  },
  {
    role: 'manager',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'farmers', actions: ['view', 'create', 'edit'] },
      { resource: 'customers', actions: ['view', 'create', 'edit'] },
      { resource: 'products', actions: ['view', 'create', 'edit'] },
      { resource: 'sales', actions: ['view', 'create', 'edit'] },
      { resource: 'transactions', actions: ['view', 'create', 'edit'] },
      { resource: 'coupons', actions: ['view', 'create', 'edit'] },
      { resource: 'employees', actions: ['view'] },
      { resource: 'tickets', actions: ['view', 'create', 'edit'] }
    ]
  },
  {
    role: 'sales_executive',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'farmers', actions: ['view'] },
      { resource: 'customers', actions: ['view', 'create'] },
      { resource: 'products', actions: ['view'] },
      { resource: 'sales', actions: ['view', 'create'] },
      { resource: 'coupons', actions: ['view'] }
    ]
  },
  {
    role: 'support_agent',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'farmers', actions: ['view'] },
      { resource: 'customers', actions: ['view'] },
      { resource: 'tickets', actions: ['view', 'create', 'edit'] }
    ]
  }
];

// Helper function to get all employees (initial + registered)
export const getAllEmployees = (): Employee[] => {
  const registeredEmployeesStr = localStorage.getItem('registeredEmployees');
  const registeredEmployees = registeredEmployeesStr ? JSON.parse(registeredEmployeesStr) : [];
  
  // Combine initial employees with registered employees
  const allEmployees = [...initialEmployees, ...registeredEmployees];
  
  // Remove duplicates based on ID and convert date strings to Date objects
  return allEmployees
    .filter((employee, index, self) => 
      index === self.findIndex(e => e.id === employee.id)
    )
    .map(employee => ({
      ...employee,
      dateJoined: employee.dateJoined instanceof Date ? employee.dateJoined : new Date(employee.dateJoined)
    }));
};

// Helper function to get accessible resources for a role
export const getAccessibleResources = (role: string): string[] => {
  const storedPermissions = localStorage.getItem('rolePermissions');
  const permissionsToUse = storedPermissions ? JSON.parse(storedPermissions) : rolePermissions;
  
  const rolePermission = permissionsToUse.find((rp: RolePermission) => rp.role === role);
  if (!rolePermission) return [];
  
  return rolePermission.permissions.map(p => p.resource);
};

// Employee management functions
export const saveEmployeesToLocalStorage = (employees: Employee[]): void => {
  try {
    localStorage.setItem('farmEmployees', JSON.stringify(employees));
  } catch (error) {
    console.error('Error saving employees to localStorage:', error);
  }
};

export const getEmployeesFromLocalStorage = (): Employee[] => {
  try {
    const storedEmployees = localStorage.getItem('farmEmployees');
    if (storedEmployees) {
      return JSON.parse(storedEmployees);
    }
    return [];
  } catch (error) {
    console.error('Error loading employees from localStorage:', error);
    return [];
  }
};

// Product management functions
export const saveProductsToLocalStorage = (products: Product[]): void => {
  try {
    localStorage.setItem('farmProducts', JSON.stringify(products));
  } catch (error) {
    console.error('Error saving products to localStorage:', error);
  }
};

export const getProductsFromLocalStorage = (): Product[] => {
  try {
    const storedProducts = localStorage.getItem('farmProducts');
    if (storedProducts) {
      const parsedProducts = JSON.parse(storedProducts);
      // Convert date strings back to Date objects
      return parsedProducts.map((product: any) => ({
        ...product,
        date: new Date(product.date)
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading products from localStorage:', error);
    return [];
  }
};

// Coupon management functions
export const saveCouponsToLocalStorage = (coupons: Coupon[]): void => {
  try {
    localStorage.setItem('farmCoupons', JSON.stringify(coupons));
  } catch (error) {
    console.error('Error saving coupons to localStorage:', error);
  }
};

export const getCouponsFromLocalStorage = (): Coupon[] => {
  try {
    const storedCoupons = localStorage.getItem('farmCoupons');
    if (storedCoupons) {
      const parsedCoupons = JSON.parse(storedCoupons);
      // Convert date strings back to Date objects
      return parsedCoupons.map((coupon: any) => ({
        ...coupon,
        expiryDate: new Date(coupon.expiryDate)
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading coupons from localStorage:', error);
    return [];
  }
};

// Helper functions
export const clearLocalStorage = (): void => {
  try {
    localStorage.clear();
    console.log('Local storage cleared successfully.');
  } catch (error) {
    console.error('Error clearing local storage:', error);
  }
};
