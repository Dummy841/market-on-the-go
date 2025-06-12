import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextProps {
  user: User | null;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkPermission: (resource: string, action: string) => boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: any[];
}

interface AuthProviderProps {
  children: ReactNode;
}

// Mock users for demo purposes - these will be supplemented by Supabase data
const mockUsers = [
  { id: '1', name: 'Admin User', email: 'admin@dostanfarms.com', role: 'admin', password: 'password' },
  { id: '2', name: 'Sales Executive', email: 'sales@dostanfarms.com', role: 'sales', password: 'password' },
  { id: '3', name: 'Manager User', email: 'manager@dostanfarms.com', role: 'manager', password: 'password' }
];

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);

  // Fetch role permissions from database
  const fetchRolePermissions = async (roleName: string) => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('permissions')
        .eq('name', roleName)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching role permissions:', error);
        return [];
      }

      console.log('Fetched role permissions:', data);
      
      // Ensure permissions is always an array
      let permissions = data?.permissions || [];
      
      // Handle different permission formats from Supabase
      if (typeof permissions === 'string') {
        try {
          permissions = JSON.parse(permissions);
        } catch (e) {
          console.error('Error parsing permissions:', e);
          permissions = [];
        }
      } else if (!Array.isArray(permissions)) {
        // If it's an object but not an array, convert it to array format
        permissions = [];
      }
      
      return Array.isArray(permissions) ? permissions : [];
    } catch (error) {
      console.error('Error in fetchRolePermissions:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      // Fetch permissions for the user's role
      fetchRolePermissions(user.role).then(permissions => {
        setRolePermissions(permissions);
      });
    } else {
      localStorage.removeItem('user');
      setRolePermissions([]);
    }
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('Login attempt:', { username, password });
    
    try {
      // First check Supabase employees
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*');

      let allUsers = [...mockUsers];
      
      if (!error && employees) {
        console.log('Supabase employees:', employees);
        const formattedEmployees = employees.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          password: emp.password
        }));
        allUsers = [...allUsers, ...formattedEmployees];
      }
      
      const registeredEmployees = localStorage.getItem('registeredEmployees');
      if (registeredEmployees) {
        try {
          const employees = JSON.parse(registeredEmployees);
          const formattedEmployees = employees.map((emp: any) => ({
            id: emp.id,
            name: emp.name,
            email: emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '')}@dostanfarms.com`,
            role: emp.role || 'sales',
            password: emp.password || 'password'
          }));
          allUsers = [...allUsers, ...formattedEmployees];
        } catch (error) {
          console.error('Error parsing registered employees:', error);
        }
      }
      
      const foundUser = allUsers.find(u => {
        const usernameMatch = u.email === username || 
                             u.name.toLowerCase().replace(/\s+/g, '') === username.toLowerCase() ||
                             u.name.toLowerCase() === username.toLowerCase();
        const passwordMatch = u.password === password;
        return usernameMatch && passwordMatch;
      });
      
      if (foundUser) {
        console.log('Login successful for:', foundUser);
        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const checkPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    
    console.log('Checking permission:', { resource, action, rolePermissions });
    
    // Check database permissions first
    if (Array.isArray(rolePermissions) && rolePermissions.length > 0) {
      const resourcePermission = rolePermissions.find((p: any) => p.resource === resource);
      if (resourcePermission && Array.isArray(resourcePermission.actions)) {
        return resourcePermission.actions.includes(action);
      }
    }

    // Fallback to default admin permissions for admin role
    if (user.role === 'admin') {
      return true;
    }

    return false;
  };

  const value: AuthContextProps = {
    user,
    currentUser: user,
    login,
    logout,
    checkPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthProvider, useAuth };
