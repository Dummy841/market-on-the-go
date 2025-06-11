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
      { resource: 'tickets', actions: ['view', 'create', 'edit', 'delete'] },
      { resource: 'customer', actions: ['view'] }
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
      { resource: 'tickets', actions: ['view', 'create', 'edit'] },
      { resource: 'customer', actions: ['view'] }
    ]
  },
  {
    role: 'employee',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'customers', actions: ['view', 'create'] },
      { resource: 'products', actions: ['view'] },
      { resource: 'categories', actions: ['view'] },
      { resource: 'sales', actions: ['view', 'create'] },
      { resource: 'tickets', actions: ['view', 'create'] },
      { resource: 'customer', actions: ['view'] }
    ]
  },
  {
    role: 'cashier',
    permissions: [
      { resource: 'dashboard', actions: ['view'] },
      { resource: 'customers', actions: ['view', 'create'] },
      { resource: 'products', actions: ['view'] },
      { resource: 'categories', actions: ['view'] },
      { resource: 'sales', actions: ['view', 'create'] },
      { resource: 'transactions', actions: ['view'] },
      { resource: 'coupons', actions: ['view'] },
      { resource: 'customer', actions: ['view'] }
    ]
  }
];

export const getAccessibleResources = (role: Role): string[] => {
  console.log('Getting accessible resources for role:', role);
  const rolePermission = rolePermissions.find(rp => rp.role === role);
  const resources = rolePermission ? rolePermission.permissions.map(p => p.resource) : [];
  console.log('Accessible resources:', resources);
  return resources;
};

export const hasPermission = (role: Role, resource: string, action: string): boolean => {
  console.log('Checking permission for:', { role, resource, action });
  
  const rolePermission = rolePermissions.find(rp => rp.role === role);
  if (!rolePermission) {
    console.log('No role permission found for role:', role);
    return false;
  }
  
  const resourcePermission = rolePermission.permissions.find(p => p.resource === resource);
  if (!resourcePermission) {
    console.log('No resource permission found for resource:', resource);
    return false;
  }
  
  const hasAction = resourcePermission.actions.includes(action as any);
  console.log('Permission result:', hasAction);
  return hasAction;
};

export const getAllEmployees = () => {
  // Return mock employee data since this appears to be used for dashboard statistics
  // In a real application, this would fetch from a database or API
  return [
    { id: '1', name: 'John Doe', role: 'admin', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', role: 'manager', email: 'jane@example.com' },
    { id: '3', name: 'Bob Johnson', role: 'employee', email: 'bob@example.com' },
    { id: '4', name: 'Alice Brown', role: 'cashier', email: 'alice@example.com' }
  ];
};
