
import { Role, RolePermission } from './types';

export const rolePermissions: RolePermission[] = [
  {
    role: 'admin',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'farmers', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'products', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'categories', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'sales', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'transactions', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'settlements', actions: ['view', 'create', 'edit', 'delete'] },
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
      { resource: 'categories', actions: ['view', 'create', 'edit'] },
      { resource: 'sales', actions: ['view', 'create'] },
      { resource: 'transactions', actions: ['view'] },
      { resource: 'settlements', actions: ['view'] },
      { resource: 'coupons', actions: ['view', 'create'] },
      { resource: 'employees', actions: ['view'] },
      { resource: 'tickets', actions: ['view', 'create', 'edit'] }
    ]
  },
  {
    role: 'employee',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'customers', actions: ['view', 'create'] },
      { resource: 'products', actions: ['view'] },
      { resource: 'sales', actions: ['view', 'create'] },
      { resource: 'tickets', actions: ['view', 'create'] }
    ]
  },
  {
    role: 'cashier',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'customers', actions: ['view', 'create'] },
      { resource: 'products', actions: ['view'] },
      { resource: 'sales', actions: ['view', 'create'] },
      { resource: 'transactions', actions: ['view'] },
      { resource: 'coupons', actions: ['view'] }
    ]
  }
];

export const getAccessibleResources = (role: Role): string[] => {
  const rolePermission = rolePermissions.find(rp => rp.role === role);
  return rolePermission ? rolePermission.permissions.map(p => p.resource) : [];
};

export const hasPermission = (role: Role, resource: string, action: string): boolean => {
  const rolePermission = rolePermissions.find(rp => rp.role === role);
  if (!rolePermission) return false;
  
  const resourcePermission = rolePermission.permissions.find(p => p.resource === resource);
  return resourcePermission ? resourcePermission.actions.includes(action as any) : false;
};
