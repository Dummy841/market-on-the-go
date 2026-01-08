import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, RotateCcw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DashboardHome = () => {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [pendingSettlements, setPendingSettlements] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      // Fetch pending orders count
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "accepted", "preparing"]);
      
      setPendingOrders(ordersCount || 0);

      // Fetch pending refunds count (rejected orders not yet refunded)
      const { count: refundsCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("seller_status", "rejected")
        .neq("status", "refunded");
      
      setPendingRefunds(refundsCount || 0);

      // Fetch pending settlements count (pending withdrawal transactions)
      const { count: settlementsCount } = await supabase
        .from("seller_wallet_transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "withdrawal")
        .like("description", "%Pending%");
      
      setPendingSettlements(settlementsCount || 0);
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Orders",
      icon: FileText,
      count: pendingOrders,
      label: "Pending",
      color: "bg-blue-500",
      path: "/dashboard/orders",
    },
    {
      title: "Settlements",
      icon: Wallet,
      count: pendingSettlements,
      label: "Pending",
      color: "bg-green-500",
      path: "/dashboard/settlements",
    },
    {
      title: "Refunds",
      icon: RotateCcw,
      count: pendingRefunds,
      label: "Pending",
      color: "bg-orange-500",
      path: "/dashboard/refunds",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card 
            key={action.title}
            className="cursor-pointer hover:shadow-lg transition-shadow border-border"
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.label}</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? "..." : action.count}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
