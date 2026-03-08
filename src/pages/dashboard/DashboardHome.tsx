import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, RotateCcw, Wallet, MessageCircle, Store, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const DashboardHome = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const [counts, setCounts] = useState({ orders: 0, refunds: 0, settlements: 0, chats: 0, wsOrders: 0, wsInventory: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [ordersRes, refundsRes, settlementsRes, chatsRes, wsOrdersRes, wsInvRes] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "accepted", "preparing"]),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("seller_status", "rejected").neq("status", "refunded"),
        supabase.from("seller_wallet_transactions").select("*", { count: "exact", head: true }).eq("type", "withdrawal").like("description", "%Pending%"),
        supabase.from("support_chats").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("wholesale_orders").select("*", { count: "exact", head: true }).in("order_status", ["pending", "verified", "dispatched"]),
        supabase.from("wholesale_products").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      setCounts({
        orders: ordersRes.count || 0,
        refunds: refundsRes.count || 0,
        settlements: settlementsRes.count || 0,
        chats: chatsRes.count || 0,
        wsOrders: wsOrdersRes.count || 0,
        wsInventory: wsInvRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setLoading(false);
    }
  };

  const allActions = [
    { title: "Online Orders", icon: FileText, count: counts.orders, label: "Pending", color: "bg-blue-500", path: "/dashboard/orders", perm: "orders" },
    { title: "WS Orders", icon: Package, count: counts.wsOrders, label: "Active", color: "bg-indigo-500", path: "/dashboard/wholesale-orders", perm: "wholesale_orders" },
    { title: "Support", icon: MessageCircle, count: counts.chats, label: "Open", color: "bg-purple-500", path: "/dashboard/support-chats", perm: "support_chats" },
    { title: "WS Inventory", icon: Store, count: counts.wsInventory, label: "Products", color: "bg-teal-500", path: "/dashboard/wholesale-inventory", perm: "wholesale_inventory" },
    { title: "Settlements", icon: Wallet, count: counts.settlements, label: "Pending", color: "bg-green-500", path: "/dashboard/settlements", perm: "settlements" },
    { title: "Refunds", icon: RotateCcw, count: counts.refunds, label: "Pending", color: "bg-orange-500", path: "/dashboard/refunds", perm: "refunds" },
  ];

  const visibleActions = allActions.filter(a => hasPermission(a.perm));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {visibleActions.map((action) => (
          <div
            key={action.title}
            className="cursor-pointer rounded-lg border border-border p-3 hover:shadow-md transition-shadow bg-card"
            onClick={() => navigate(action.path)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${action.color}`}>
                <action.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground truncate">{action.title}</p>
              <p className="text-xl font-bold text-foreground">{loading ? "..." : action.count}</p>
            </div>
          </div>
        ))}
      </div>

      {visibleActions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No quick actions available for your role.</p>
      )}
    </div>
  );
};

export default DashboardHome;
