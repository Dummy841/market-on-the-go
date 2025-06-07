
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  resource: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ resource, action, children }) => {
  const { currentUser, checkPermission } = useAuth();

  console.log('ProtectedRoute check:', { 
    currentUser: currentUser?.name, 
    role: currentUser?.role, 
    resource, 
    action 
  });

  // Handle customer routes differently
  if (resource === 'customer') {
    const currentCustomer = localStorage.getItem('currentCustomer');
    if (!currentCustomer) {
      console.log('No current customer, redirecting to customer login');
      return <Navigate to="/customer-login" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  // Handle farmer routes differently  
  if (resource === 'farmers' && !currentUser) {
    const currentFarmer = localStorage.getItem('currentFarmer');
    if (currentFarmer) {
      return children ? <>{children}</> : <Outlet />;
    }
  }

  if (!currentUser) {
    console.log('No current user, redirecting to login');
    return <Navigate to="/employee-login" replace />;
  }

  const hasAccess = checkPermission(resource, action);
  console.log('Permission result:', hasAccess);

  if (!hasAccess) {
    console.log('Access denied, redirecting to access-denied page');
    return <Navigate to="/access-denied" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
