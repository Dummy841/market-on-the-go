
import React from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';
import CategoryManagement from '@/components/categories/CategoryManagement';

const CategoriesContent = () => {
  const { setOpenMobile } = useSidebar();

  // Close sidebar automatically when component mounts
  React.useEffect(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <CategoryManagement />
      </main>
    </div>
  );
};

const Categories = () => {
  return (
    <SidebarProvider>
      <CategoriesContent />
    </SidebarProvider>
  );
};

export default Categories;
