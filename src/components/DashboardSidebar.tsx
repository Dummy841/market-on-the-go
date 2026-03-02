import { useState, useEffect } from "react";
import { Users, Store, Truck, ChevronDown, BarChart3, Settings, FileText, Image, RotateCcw, Wallet, MessageCircle, Grid3X3, IndianRupee, Layers } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: BarChart3,
    type: "single"
  },
  { 
    title: "Revenue", 
    url: "/dashboard/revenue", 
    icon: IndianRupee,
    type: "single"
  },
  {
    title: "Management",
    icon: Settings,
    type: "group",
    items: [
      { title: "Users", url: "/dashboard/users", icon: Users },
      { title: "Sellers", url: "/dashboard/sellers", icon: Store },
      { title: "Orders", url: "/dashboard/orders", icon: FileText },
      { title: "Settlements", url: "/dashboard/settlements", icon: Wallet },
      { title: "Refunds", url: "/dashboard/refunds", icon: RotateCcw },
      { title: "Delivery Partners", url: "/dashboard/delivery-partners", icon: Truck },
      { title: "Banners", url: "/dashboard/banners", icon: Image },
      { title: "Modules", url: "/dashboard/modules", icon: Grid3X3 },
      { title: "Subcategories", url: "/dashboard/subcategories", icon: Layers },
      { title: "Support Chats", url: "/dashboard/support-chats", icon: MessageCircle },
      { title: "Wholesale Inventory", url: "/dashboard/wholesale-inventory", icon: Store },
      { title: "Wholesale Orders", url: "/dashboard/wholesale-orders", icon: FileText, badgeKey: "wholesaleOrders" },
    ]
  }
];

export function DashboardSidebar() {
  const { open } = useSidebar();
  const [wholesaleOrderCount, setWholesaleOrderCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("wholesale_orders")
        .select("*", { count: "exact", head: true })
        .in("order_status", ["pending", "verified"]);
      if (!error && count) setWholesaleOrderCount(count);
    };
    fetchCount();

    const channel = supabase
      .channel("admin-wholesale-orders-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "wholesale_orders" }, () => fetchCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "wholesaleOrders") return wholesaleOrderCount;
    return 0;
  };

  return (
    <Sidebar variant="sidebar" className="border-r border-border">
      <SidebarContent className="p-0">
        <div className="p-4 border-b border-border">
          <h2 className={`font-semibold text-foreground transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}>
            Admin Panel
          </h2>
        </div>

        <div className="p-2">
          {menuItems.map((item, index) => (
            <div key={index} className="mb-2">
              {item.type === "single" ? (
                <SidebarMenuButton asChild className="w-full">
                  <NavLink 
                    to={item.url} 
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full ${
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {open && <span className="truncate">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              ) : (
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full hover:bg-muted text-muted-foreground hover:text-foreground">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {open && (
                        <>
                          <span className="truncate flex-1 text-left">{item.title}</span>
                          <ChevronDown className="h-4 w-4 transition-transform ui-state-open:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  
                  {open && (
                    <CollapsibleContent className="ml-6 mt-1 space-y-1">
                      {item.items?.map((subItem) => {
                        const badgeCount = getBadgeCount((subItem as any).badgeKey);
                        return (
                          <SidebarMenuButton key={subItem.title} asChild>
                            <NavLink 
                              to={subItem.url} 
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                                  isActive 
                                    ? "bg-primary text-primary-foreground" 
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`
                              }
                            >
                              <subItem.icon className="h-4 w-4 flex-shrink-0" />
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
              )}
            </div>
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
