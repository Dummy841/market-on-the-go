
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/utils/employeeData';

interface ProtectedRouteProps {
  resource: string;
  action: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ resource, action }) => {
  const { currentUser } = useAuth();

  console.log('ProtectedRoute check:', {
    currentUser: currentUser?.name || 'No user',
    role: currentUser?.role || 'No role',
    resource,
    action
  });

  if (!currentUser) {
    console.log('No current user, redirecting to employee login');
    return <Navigate to="/employee-login" replace />;
  }

  const hasAccess = hasPermission(currentUser.role, resource, action);
  console.log('Permission result:', hasAccess);

  if (!hasAccess) {
    console.log('Access denied, redirecting to access-denied page');
    return <Navigate to="/access-denied" replace />;
  }

  console.log('Access granted, rendering protected content');
  return <Outlet />;
};

export default ProtectedRoute;
