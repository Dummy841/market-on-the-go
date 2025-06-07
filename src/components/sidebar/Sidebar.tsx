
import React from 'react';
import { 
  Sidebar as SidebarContainer, 
  SidebarContent, 
  SidebarHeader,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import TopLevelMenu from './TopLevelMenu';
import ManageMenu from './ManageMenu';
import UserSection from './UserSection';
import { Package, Menu } from 'lucide-react';

export const Sidebar = () => {
  const { state } = useSidebar();
  
  return (
    <>
      {/* This is the main sidebar */}
      <SidebarContainer>
        <SidebarHeader className="py-6">
          <div className="flex items-center px-4 gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-agri-primary" />
              <span className="text-lg font-bold">Dostanfarms Admin</span>
            </div>
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <TopLevelMenu />
          <ManageMenu />
          <UserSection />
        </SidebarContent>
      </SidebarContainer>
      
      {/* This is the floating toggle button that appears when sidebar is collapsed */}
      {state === 'collapsed' && (
        <div className="fixed z-50 top-4 left-4">
          <SidebarTrigger className="bg-white shadow-md border rounded-md p-2">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>
      )}
    </>
  );
};
