import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Role, RolePermission } from '@/utils/types';
import { rolePermissions } from '@/utils/employeeData';
import { ArrowLeft, Plus } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resources = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'farmers', name: 'Farmers' },
  { id: 'customers', name: 'Customers' },
  { id: 'products', name: 'Products' },
  { id: 'sales', name: 'Add Sale' },
  { id: 'transactions', name: 'Transactions' },
  { id: 'settlements', name: 'Settlements' },
  { id: 'coupons', name: 'Coupons' },
  { id: 'employees', name: 'Employees' },
  { id: 'roles', name: 'Roles' },
  { id: 'tickets', name: 'Tickets' }
];

const actions = [
  { id: 'view', name: 'View' },
  { id: 'create', name: 'Create' },
  { id: 'edit', name: 'Edit' },
  { id: 'delete', name: 'Delete' }
];

const Roles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role>('admin');
  const [permissions, setPermissions] = useState<RolePermission['permissions']>([]);
  const [savedRolePermissions, setSavedRolePermissions] = useState<RolePermission[]>([]);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    // Load role permissions from localStorage or use default
    const storedPermissions = localStorage.getItem('rolePermissions');
    const initialPermissions = storedPermissions ? JSON.parse(storedPermissions) : rolePermissions;
    setSavedRolePermissions(initialPermissions);

    // Set current permissions based on selected role
    const currentRolePermissions = initialPermissions.find(
      (rp: RolePermission) => rp.role === selectedRole
    )?.permissions || [];
    setPermissions([...currentRolePermissions]);
  }, [selectedRole]);

  const handlePermissionChange = (resource: string, action: string, checked: boolean) => {
    setPermissions(prev => {
      const resourceIndex = prev.findIndex(p => p.resource === resource);
      
      if (resourceIndex === -1 && checked) {
        // Add new resource with this action
        return [...prev, { resource, actions: [action as 'view' | 'create' | 'edit' | 'delete'] }];
      }
      
      if (resourceIndex >= 0) {
        const updatedPermissions = [...prev];
        const resourcePermission = { ...updatedPermissions[resourceIndex] };
        
        if (checked) {
          // Add action to existing resource
          resourcePermission.actions = [...resourcePermission.actions, action as 'view' | 'create' | 'edit' | 'delete'];
        } else {
          // Remove action from resource
          resourcePermission.actions = resourcePermission.actions.filter(a => a !== action);
        }
        
        updatedPermissions[resourceIndex] = resourcePermission;
        
        // If no actions left for this resource, remove it
        if (resourcePermission.actions.length === 0) {
          updatedPermissions.splice(resourceIndex, 1);
        }
        
        return updatedPermissions;
      }
      
      return prev;
    });
  };

  const handleSavePermissions = () => {
    const updatedRolePermissions = savedRolePermissions.map(rp => 
      rp.role === selectedRole ? { ...rp, permissions } : rp
    );
    
    setSavedRolePermissions(updatedRolePermissions);
    localStorage.setItem('rolePermissions', JSON.stringify(updatedRolePermissions));
    
    toast({
      title: "Permissions Updated",
      description: `Permissions for ${selectedRole} role have been updated successfully.`
    });
  };

  const handleBack = () => {
    navigate('/');
  };

  const hasPermission = (resource: string, action: string) => {
    const resourcePermission = permissions.find(p => p.resource === resource);
    return resourcePermission?.actions.includes(action as 'view' | 'create' | 'edit' | 'delete') || false;
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Role name required",
        description: "Please provide a name for the new role.",
        variant: "destructive"
      });
      return;
    }
    
    // Convert to lowercase and remove spaces for role ID
    const roleId = newRoleName.toLowerCase().replace(/\s+/g, '-') as Role;
    
    // Check if role already exists
    if (savedRolePermissions.some(rp => rp.role === roleId)) {
      toast({
        title: "Role already exists",
        description: `A role with the ID '${roleId}' already exists.`,
        variant: "destructive"
      });
      return;
    }
    
    // Create new role with default permissions (view dashboard only)
    const newRole: RolePermission = {
      role: roleId as Role,
      permissions: [{ resource: 'dashboard', actions: ['view'] }]
    };
    
    const updatedRoles = [...savedRolePermissions, newRole];
    setSavedRolePermissions(updatedRoles);
    localStorage.setItem('rolePermissions', JSON.stringify(updatedRoles));
    
    // Close dialog and select the new role
    setCreateRoleDialogOpen(false);
    setNewRoleName('');
    setSelectedRole(roleId as Role);
    
    toast({
      title: "Role Created",
      description: `New role '${newRoleName}' has been created successfully.`
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="icon" 
                className="mr-4" 
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
              <h1 className="text-2xl font-bold">Role Management</h1>
            </div>
            <Button 
              onClick={() => setCreateRoleDialogOpen(true)}
              className="bg-agri-primary hover:bg-agri-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Manage permissions for different roles in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Role</label>
                <Select 
                  value={selectedRole} 
                  onValueChange={(value) => setSelectedRole(value as Role)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedRolePermissions.map((rp) => (
                      <SelectItem key={rp.role} value={rp.role}>
                        {rp.role.charAt(0).toUpperCase() + rp.role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Resource</TableHead>
                      {actions.map(action => (
                        <TableHead key={action.id}>{action.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map(resource => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.name}</TableCell>
                        {actions.map(action => (
                          <TableCell key={action.id}>
                            <Checkbox 
                              checked={hasPermission(resource.id, action.id)}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(resource.id, action.id, checked === true)
                              }
                              disabled={
                                // Only admin can edit the 'roles' resource permissions
                                resource.id === 'roles' && selectedRole !== 'admin' && action.id !== 'view'
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSavePermissions}>
                  Save Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Dialog open={createRoleDialogOpen} onOpenChange={setCreateRoleDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Add a new role to the system. You can set permissions after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roleName" className="text-right">
                    Role Name
                  </Label>
                  <Input
                    id="roleName"
                    placeholder="e.g., Store Manager"
                    className="col-span-3"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateRoleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>Create Role</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Roles;
