import { useState, useEffect } from "react";
import { Users, Store, Truck, ChevronDown, BarChart3, Settings, FileText, Image, RotateCcw, Wallet, MessageCircle, Grid3X3, IndianRupee, Layers, Factory, UserCog, ScrollText, Shield } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, type: "single" },
  { title: "Users", url: "/dashboard/users", icon: Users, type: "single", permissionKey: "users" },
  { title: "Sellers", url: "/dashboard/sellers", icon: Store, type: "single", permissionKey: "sellers" },
  {
    title: "Employee Mgmt",
    icon: UserCog,
    type: "group",
    permissionKey: "employees",
    items: [
      { title: "Employees", url: "/dashboard/employees", icon: Users },
    ],
  },
  {
    title: "Online Mgmt",
    icon: Settings,
    type: "group",
    items: [
      { title: "Revenue", url: "/dashboard/revenue", icon: IndianRupee, superAdminOnly: true },
      { title: "Orders", url: "/dashboard/orders", icon: FileText, permissionKey: "orders" },
      { title: "Settlements", url: "/dashboard/settlements", icon: Wallet, permissionKey: "settlements" },
      { title: "Refunds", url: "/dashboard/refunds", icon: RotateCcw, permissionKey: "refunds" },
      { title: "Delivery", url: "/dashboard/delivery-partners", icon: Truck, permissionKey: "delivery_partners" },
      { title: "Banners", url: "/dashboard/banners", icon: Image, permissionKey: "banners" },
      { title: "Modules", url: "/dashboard/modules", icon: Grid3X3, permissionKey: "modules" },
      { title: "Subcategories", url: "/dashboard/subcategories", icon: Layers, permissionKey: "subcategories" },
      { title: "Support", url: "/dashboard/support-chats", icon: MessageCircle, permissionKey: "support_chats" },
      { title: "Terms & Conditions", url: "/dashboard/terms-conditions", icon: ScrollText, permissionKey: "terms_conditions" },
      { title: "Privacy Policy", url: "/dashboard/privacy-policy", icon: Shield, permissionKey: "privacy_policy" },
    ],
  },
  {
    title: "Wholesale Mgmt",
    icon: Store,
    type: "group",
    items: [
      { title: "WS Revenue", url: "/dashboard/wholesale-revenue", icon: IndianRupee, superAdminOnly: true },
      { title: "WS Inventory", url: "/dashboard/wholesale-inventory", icon: Store, permissionKey: "wholesale_inventory" },
      { title: "WS Orders", url: "/dashboard/wholesale-orders", icon: FileText, permissionKey: "wholesale_orders", badgeKey: "wholesaleOrders" },
      { title: "Production", url: "/dashboard/production", icon: Factory, permissionKey: "production" },
    ],
  },
];

export function DashboardSidebar() {
  const { open, setOpenMobile, isMobile } = useSidebar();
  const { hasPermission, isSuperAdmin } = useAdminAuth();
  const [wholesaleOrderCount, setWholesaleOrderCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("wholesale_orders")
        .select("*", { count: "exact", head: true })
        .in("order_status", ["pending", "verified"])
        .neq("payment_status", "rejected");
      if (!error && count) setWholesaleOrderCount(count);
    };
    fetchCount();
    const channel = supabase
      .channel("admin-wholesale-orders-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "wholesale_orders" }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "wholesaleOrders") return wholesaleOrderCount;
    return 0;
  };

  const canSeeItem = (item: any) => {
    if (item.superAdminOnly) return isSuperAdmin();
    if (item.permissionKey) return hasPermission(item.permissionKey);
    return true;
  };

  const getVisibleSubItems = (items: any[]) => items.filter(canSeeItem);

  return (
    <Sidebar variant="sidebar" className="border-r border-border">
      <SidebarContent className="p-0">
        <div className="p-4 border-b border-border">
          <h2 className={`font-semibold text-foreground transition-opacity ${open || isMobile ? "opacity-100" : "opacity-0"}`}>
            Admin Panel
          </h2>
        </div>

        <div className="p-2">
          {menuItems.map((item, index) => {
            if (item.type === "single") {
              if (!canSeeItem(item)) return null;
              return (
                <div key={index} className="mb-1">
                  <SidebarMenuButton asChild className="w-full">
                    <NavLink
                      to={item.url!}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full ${
                          isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {(open || isMobile) && <span className="truncate text-base">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </div>
              );
            }

            const visibleSubs = getVisibleSubItems(item.items || []);
            if (item.permissionKey && !hasPermission(item.permissionKey)) return null;
            if (visibleSubs.length === 0 && !item.permissionKey) return null;

            return (
              <div key={index} className="mb-1">
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full hover:bg-muted text-muted-foreground hover:text-foreground">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {(open || isMobile) && (
                        <>
                          <span className="truncate flex-1 text-left text-base">{item.title}</span>
                          <ChevronDown className="h-4 w-4 transition-transform ui-state-open:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {(open || isMobile) && (
                    <CollapsibleContent className="ml-6 mt-1 space-y-0.5">
                      {visibleSubs.map((subItem: any) => {
                        const badgeCount = getBadgeCount(subItem.badgeKey);
                        return (
                          <SidebarMenuButton key={subItem.title} asChild>
                            <NavLink
                              to={subItem.url}
                              className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${
                                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`
                              }
                            >
                              <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate flex-1">{subItem.title}</span>
                              {badgeCount > 0 && (
                                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
                                  {badgeCount}
                                </Badge>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        );
                      })}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </div>
            );
          })}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
