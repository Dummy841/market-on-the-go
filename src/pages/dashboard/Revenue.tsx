import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndianRupee, TrendingUp, Wallet, RotateCcw, ArrowUpRight, ArrowDownRight, X, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RevenueStats {
  totalRevenue: number;
  settledToSellers: number;
  refundedToUsers: number;
  totalProfit: number;
  deliveryFees: number;
  platformFees: number;
  penaltiesCollected: number;
  needToSettleToSellers: number;
  zippyPassRevenue: number;
  commissionEarned: number;
  smallCartFees: number;
}

const Revenue = () => {
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    settledToSellers: 0,
    refundedToUsers: 0,
    totalProfit: 0,
    deliveryFees: 0,
    platformFees: 0,
    penaltiesCollected: 0,
    needToSettleToSellers: 0,
    zippyPassRevenue: 0,
    commissionEarned: 0,
    smallCartFees: 0
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchRevenueStats();
  }, [startDate, endDate]);

  const fetchRevenueStats = async () => {
    try {
      setLoading(true);
      
      // Build date filter for orders
      let ordersQuery = supabase.from("orders").select("total_amount, delivery_fee, platform_fee, gst_charges, items, created_at, seller_id").eq("status", "delivered");
      
      if (startDate) {
        ordersQuery = ordersQuery.gte("created_at", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte("created_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data: deliveredOrders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Calculate totals from delivered orders
      let totalOrderAmount = 0;
      let deliveryFees = 0;
      let platformFees = 0;
      let totalSellerEarnings = 0;
      let commissionEarned = 0;
      let smallCartFees = 0;

      // Get all sellers for franchise percentage
      const { data: sellers } = await supabase.from("sellers").select("id, franchise_percentage");
      const sellerFranchiseMap = new Map(sellers?.map(s => [s.id, s.franchise_percentage || 0]) || []);

      (deliveredOrders || []).forEach(order => {
        totalOrderAmount += order.total_amount || 0;
        deliveryFees += order.delivery_fee || 0;
        platformFees += order.platform_fee || 0;

        // Calculate item totals and small cart fee
        const items = Array.isArray(order.items) ? order.items : [];
        let itemSubtotal = 0;
        const franchisePercentage = sellerFranchiseMap.get(order.seller_id) || 0;
        
        items.forEach((item: any) => {
          const itemTotal = (item.seller_price || 0) * (item.quantity || 1);
          itemSubtotal += itemTotal;
          // Commission earned from each item
          commissionEarned += itemTotal * (franchisePercentage / 100);
          // Seller earnings (after commission)
          totalSellerEarnings += itemTotal * (1 - franchisePercentage / 100);
        });

        // Small cart fee: ₹10 for orders with item subtotal < ₹100
        if (itemSubtotal < 100) {
          smallCartFees += 10;
        }
      });

      // Fetch settled amounts to sellers (type = 'settled' or description contains 'Settled')
      let settlementsQuery = supabase.from("seller_wallet_transactions").select("amount, created_at").or("type.eq.settled,description.ilike.%settled%");
      
      if (startDate) {
        settlementsQuery = settlementsQuery.gte("created_at", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        settlementsQuery = settlementsQuery.lte("created_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data: settlements, error: settlementsError } = await settlementsQuery;
      if (settlementsError) throw settlementsError;
      const settledToSellers = (settlements || []).reduce((sum, s) => sum + Math.abs(s.amount), 0);

      // Fetch refunded amounts
      let refundedQuery = supabase.from("orders").select("total_amount, created_at").eq("status", "refunded");
      
      if (startDate) {
        refundedQuery = refundedQuery.gte("created_at", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        refundedQuery = refundedQuery.lte("created_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data: refundedOrders, error: refundsError } = await refundedQuery;
      if (refundsError) throw refundsError;
      const refundedToUsers = (refundedOrders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

      // Calculate penalties (₹10 per rejected/refunded order)
      let penaltyQuery = supabase.from("orders").select("id, created_at").in("status", ["rejected", "refunded"]);
      
      if (startDate) {
        penaltyQuery = penaltyQuery.gte("created_at", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        penaltyQuery = penaltyQuery.lte("created_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data: penaltyOrders } = await penaltyQuery;
      const penaltiesCollected = (penaltyOrders?.length || 0) * 10;

      // Fetch Zippy Pass subscription revenue
      let zippyPassQuery = supabase.from("zippy_pass_subscriptions").select("amount, created_at");
      
      if (startDate) {
        zippyPassQuery = zippyPassQuery.gte("created_at", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        zippyPassQuery = zippyPassQuery.lte("created_at", format(endDate, "yyyy-MM-dd") + "T23:59:59");
      }

      const { data: zippyPassSubs } = await zippyPassQuery;
      const zippyPassRevenue = (zippyPassSubs || []).reduce((sum, sub) => sum + (sub.amount || 0), 0);

      // Total Revenue = Delivered orders total_amount + Penalties collected + Zippy Pass revenue
      const totalRevenue = totalOrderAmount + penaltiesCollected + zippyPassRevenue;

      // Need to settle = seller earnings - already settled - penalties
      const needToSettleToSellers = Math.max(0, totalSellerEarnings - settledToSellers - penaltiesCollected);

      // Total Profit = Commission + Delivery Fees + Platform Fees + Small Cart Fees + Zippy Pass Revenue
      const totalProfit = commissionEarned + deliveryFees + platformFees + smallCartFees + zippyPassRevenue;

      setStats({
        totalRevenue,
        settledToSellers,
        refundedToUsers,
        totalProfit,
        deliveryFees,
        platformFees,
        penaltiesCollected,
        needToSettleToSellers,
        zippyPassRevenue,
        commissionEarned,
        smallCartFees
      });
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: stats.totalRevenue,
      icon: IndianRupee,
      description: "Orders + Penalties + Zippy Pass",
      color: "bg-green-500",
      textColor: "text-green-600",
      trend: "up"
    },
    {
      title: "Settled to Sellers",
      value: stats.settledToSellers,
      icon: Wallet,
      description: "Amount paid out to sellers",
      color: "bg-blue-500",
      textColor: "text-blue-600",
      trend: "down"
    },
    {
      title: "Refunds to Users",
      value: stats.refundedToUsers,
      icon: RotateCcw,
      description: "Refunded for cancelled/rejected orders",
      color: "bg-orange-500",
      textColor: "text-orange-600",
      trend: "down"
    },
    {
      title: "Total Profit",
      value: stats.totalProfit,
      icon: TrendingUp,
      description: "Commission + Fees + Zippy Pass",
      color: "bg-purple-500",
      textColor: "text-purple-600",
      trend: "up"
    }
  ];

  const breakdownCards = [
    {
      title: "Commission Earned",
      value: stats.commissionEarned,
      description: "Commission from seller items"
    },
    {
      title: "Delivery Fees",
      value: stats.deliveryFees,
      description: "Total delivery charges collected"
    },
    {
      title: "Platform Fees",
      value: stats.platformFees,
      description: "Platform service charges"
    },
    {
      title: "Small Cart Fees",
      value: stats.smallCartFees,
      description: "Fees from orders under ₹100"
    },
    {
      title: "Zippy Pass Revenue",
      value: stats.zippyPassRevenue,
      description: "Revenue from Zippy Pass subscriptions"
    },
    {
      title: "Penalties Collected",
      value: stats.penaltiesCollected,
      description: "Penalties from rejected orders"
    },
    {
      title: "Need to Settle",
      value: stats.needToSettleToSellers,
      description: "Pending seller earnings (after penalties)"
    }
  ];

  const hasFilter = startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Revenue Dashboard</h2>
          <p className="text-muted-foreground text-sm">Overview of all financial metrics</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd MMM yyyy") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd MMM yyyy") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <Card key={stat.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                {stat.trend === "up" ? <ArrowUpRight className="h-5 w-5 text-green-500" /> : <ArrowDownRight className="h-5 w-5 text-red-500" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>
                  {loading ? "..." : formatCurrency(stat.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Profit Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {breakdownCards.map(item => (
              <div key={item.title} className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <p className="text-xl font-semibold text-foreground">
                  {loading ? "..." : formatCurrency(item.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Revenue;