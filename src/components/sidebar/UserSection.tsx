
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const UserSection = () => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Access</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {currentUser ? (
            <>
              <SidebarMenuItem>
                <div className="px-4 py-2">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentUser.role} Role</p>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="flex items-center gap-3 w-full">
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    to="/employee-login" 
                    className={`flex items-center gap-3 ${
                      location.pathname === '/employee-login' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                    }`}
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Employee Login</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    to="/farmer-login" 
                    className={`flex items-center gap-3 ${
                      location.pathname === '/farmer-login' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                    }`}
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Farmer Login</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default UserSection;
