
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenuItem, 
  SidebarMenu, 
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import { 
  ChevronDown, 
  ChevronUp, 
  Receipt, 
  Settings,
  UserCog,
  Package,
  ShoppingCart,
  BarChart3,
  Ticket,
  Gift,
  DollarSign,
  Tag
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/context/AuthContext';
import { getAccessibleResources } from '@/utils/employeeData';

const ManageMenu = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [manageOpen, setManageOpen] = useState(false);

  // Open the manage menu if current location is under any manage item
  useEffect(() => {
    const managePathsToCheck = ['/products', '/categories', '/coupons', '/tickets', '/sales-dashboard', '/settlements', '/transactions', '/employees', '/roles'];
    if (managePathsToCheck.some(path => location.pathname.startsWith(path))) {
      setManageOpen(true);
    }
  }, [location.pathname]);

  // Items in the "Manage" section
  const manageItems = [
    {
      title: 'Products',
      icon: <Package className="h-5 w-5" />,
      path: '/products',
      resource: 'products'
    },
    {
      title: 'Categories',
      icon: <Tag className="h-5 w-5" />,
      path: '/categories',
      resource: 'categories'
    },
    {
      title: 'Coupons',
      icon: <Gift className="h-5 w-5" />,
      path: '/coupons',
      resource: 'coupons'
    },
    {
      title: 'Tickets',
      icon: <Ticket className="h-5 w-5" />,
      path: '/tickets',
      resource: 'tickets'
    },
    {
      title: 'Sales Dashboard',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/sales-dashboard',
      resource: 'sales'
    },
    {
      title: 'Settlements',
      icon: <DollarSign className="h-5 w-5" />,
      path: '/settlements',
      resource: 'settlements'
    },
    {
      title: 'Transactions',
      icon: <Receipt className="h-5 w-5" />,
      path: '/transactions',
      resource: 'transactions'
    },
    {
      title: 'Employees',
      icon: <UserCog className="h-5 w-5" />,
      path: '/employees',
      resource: 'employees'
    },
    {
      title: 'Roles',
      icon: <Settings className="h-5 w-5" />,
      path: '/roles',
      resource: 'roles'
    }
  ];

  // Filter menu items based on user permissions
  const accessibleResources = currentUser ? getAccessibleResources(currentUser.role) : [];
  const filteredManageItems = currentUser 
    ? manageItems.filter(item => accessibleResources.includes(item.resource))
    : manageItems;

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  if (filteredManageItems.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Collapsible open={manageOpen} onOpenChange={setManageOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                <span>Manage</span>
              </div>
              {manageOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-9 pt-2 space-y-1">
            {filteredManageItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-3 py-2 px-3 rounded-md ${
                  location.pathname === item.path ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-muted'
                }`}
                onClick={handleLinkClick}
              >
                {item.icon}
                <span className="text-sm">{item.title}</span>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default ManageMenu;
