import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Package, Clock, CheckCircle, Truck, AlertCircle, Eye, Search, Calendar, Globe, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DeliveryPartnerAssignModal from "@/components/DeliveryPartnerAssignModal";

interface Order {
  id: string;
  user_id: string;
  seller_id: string;
  seller_name: string;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    seller_price: number;
    franchise_price: number;
  }>;
  total_amount: number;
  delivery_fee: number;
  platform_fee: number;
  gst_charges: number;
  delivery_address: string;
  delivery_mobile: string | null;
  instructions: string;
  payment_method: string;
  status: string;
  seller_status: string;
  assigned_delivery_partner_id: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
  delivery_partner?: {
    name: string;
    mobile: string;
  };
}

interface UserInfo {
  id: string;
  name: string;
  mobile: string;
}

interface SellerInfo {
  id: string;
  seller_name: string;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [usersMap, setUsersMap] = useState<Map<string, UserInfo>>(new Map());
  const [orderMode, setOrderMode] = useState<"online" | "pos">("online");
  const [sellers, setSellers] = useState<SellerInfo[]>([]);
  const [posSellerFilter, setPosSellerFilter] = useState("all");
  const [posSearchQuery, setPosSearchQuery] = useState("");
  const [posDateFilter, setPosDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  const autoRefundTriggeredRef = useRef<Set<string>>(new Set());

  const IST = "Asia/Kolkata";
  const getTodayIST = () => format(toZonedTime(new Date(), IST), "yyyy-MM-dd");
  const todayIST = getTodayIST();

  const statusOptions = [
    { label: "All", value: "All", icon: Package, color: "bg-muted" },
    { label: "Pending", value: "pending", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
    { label: "Assigned", value: "assigned", icon: Truck, color: "bg-blue-100 text-blue-800" },
    { label: "Delivered", value: "delivered", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  ];

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`*, delivery_partner:assigned_delivery_partner_id (name, mobile)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data || []) as any);

      const { data: usersData } = await supabase.from("users").select("id, name, mobile");
      if (usersData) {
        const map = new Map<string, UserInfo>();
        usersData.forEach((u: any) => map.set(u.id, u));
        setUsersMap(map);
      }

      const { data: sellersData } = await supabase.from("sellers").select("id, seller_name").order("seller_name");
      if (sellersData) setSellers(sellersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoRefund = useCallback(async (orderId: string) => {
    if (autoRefundTriggeredRef.current.has(orderId)) return;
    autoRefundTriggeredRef.current.add(orderId);
    const { data, error } = await supabase.functions.invoke("refund-rejected-order", { body: { order_id: orderId } });
    if (error || !data?.success) {
      autoRefundTriggeredRef.current.delete(orderId);
      console.error("Auto refund failed:", error || data);
    }
  }, []);

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const { data } = await supabase.from("users").select("name").eq("id", order.user_id).single();
      setCustomerName(data?.name || "N/A");
    } catch {
      setCustomerName("N/A");
    }
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") { fetchOrders(); toast({ title: "New Order", description: `New order received from ${(payload.new as any).seller_name}` }); return; }
        if (payload.eventType === "UPDATE") { setOrders((prev) => prev.map((o) => (o.id === (payload.new as any).id ? ({ ...o, ...(payload.new as any) } as any) : o))); return; }
        if (payload.eventType === "DELETE") { setOrders((prev) => prev.filter((o) => o.id !== (payload.old as any).id)); }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    orders.forEach((o) => {
      if (o.seller_status === "rejected" && o.status !== "refunded") triggerAutoRefund(o.id);
    });
  }, [orders, triggerAutoRefund]);

  const isPOSOrder = (order: Order) => order.delivery_address === "POS - In Store";

  const getOrdersForMode = () => {
    return orders.filter((o) => orderMode === "pos" ? isPOSOrder(o) : !isPOSOrder(o));
  };

  const getOrdersForDate = (date: string, base: Order[]) =>
    base.filter((order) => format(toZonedTime(new Date(order.created_at), IST), "yyyy-MM-dd") === date);

  // Online filtered orders
  const getOnlineFiltered = () => {
    let result = getOrdersForMode();
    if (dateFilter) result = getOrdersForDate(dateFilter, result);
    if (selectedStatus !== "All") result = result.filter((o) => o.status === selectedStatus);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((o) => {
        const matchesOrderId = o.id.toLowerCase().includes(query);
        const matchesMobile = o.delivery_mobile?.toLowerCase().includes(query);
        const user = usersMap.get(o.user_id);
        const matchesName = user?.name?.toLowerCase().includes(query);
        return matchesOrderId || matchesMobile || matchesName;
      });
    }
    return result;
  };

  // POS filtered orders
  const getPosFiltered = () => {
    let result = getOrdersForMode();
    if (posDateFilter) result = getOrdersForDate(posDateFilter, result);
    if (posSellerFilter && posSellerFilter !== "all") result = result.filter((o) => o.seller_id === posSellerFilter);
    if (posSearchQuery) {
      const query = posSearchQuery.toLowerCase();
      result = result.filter((o) => o.id.toLowerCase().includes(query));
    }
    return result;
  };

  const filteredOrders = orderMode === "online" ? getOnlineFiltered() : getPosFiltered();

  const dateFilteredForCounts = (() => {
    let base = getOrdersForMode();
    const df = orderMode === "online" ? dateFilter : posDateFilter;
    if (df) base = getOrdersForDate(df, base);
    return base;
  })();

  const getStatusCount = (statusVal: string) => {
    if (statusVal === "All") return dateFilteredForCounts.length;
    return dateFilteredForCounts.filter((order) => order.status === statusVal).length;
  };

  const getSellerStatusBadge = (sellerStatus: string) => {
    switch (sellerStatus) {
      case "accepted": return { color: "bg-green-100 text-green-800", text: "Accepted" };
      case "packed": return { color: "bg-blue-100 text-blue-800", text: "Packed" };
      case "rejected": return { color: "bg-red-100 text-red-800", text: "Rejected" };
      default: return { color: "bg-yellow-100 text-yellow-800", text: "Pending" };
    }
  };

  const openAssignModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setAssignModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Orders Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-foreground">Orders Management</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={orderMode === "online" ? "default" : "ghost"}
            size="sm"
            onClick={() => setOrderMode("online")}
            className="gap-1.5"
          >
            <Globe className="h-4 w-4" />
            Online
          </Button>
          <Button
            variant={orderMode === "pos" ? "default" : "ghost"}
            size="sm"
            onClick={() => setOrderMode("pos")}
            className="gap-1.5"
          >
            <Store className="h-4 w-4" />
            POS
          </Button>
        </div>
      </div>

      {orderMode === "online" && (
        <>
          {/* Status Filter Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statusOptions.map((status) => {
              const Icon = status.icon;
              const count = getStatusCount(status.value);
              return (
                <Card
                  key={status.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === status.value ? "ring-2 ring-primary shadow-md" : ""}`}
                  onClick={() => setSelectedStatus(status.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{status.label}</p>
                        <p className="text-xl font-bold">{count}</p>
                      </div>
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search + Date */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search Order ID, Mobile, or Customer Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto h-8" />
                  {dateFilter && dateFilter !== todayIST && (
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setDateFilter(todayIST)}>Today</Button>
                  )}
                  {dateFilter && (
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setDateFilter("")}>All</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {orderMode === "pos" && (
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[150px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by Order ID..." value={posSearchQuery} onChange={(e) => setPosSearchQuery(e.target.value)} className="pl-9 h-8" />
                </div>
              </div>
              <Select value={posSellerFilter} onValueChange={setPosSellerFilter}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="All Sellers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.seller_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={posDateFilter} onChange={(e) => setPosDateFilter(e.target.value)} className="w-auto h-8" />
                {posDateFilter && posDateFilter !== todayIST && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setPosDateFilter(todayIST)}>Today</Button>
                )}
                {posDateFilter && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setPosDateFilter("")}>All</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {orderMode === "online"
              ? (selectedStatus === "All" ? "All Online Orders" : `${selectedStatus} Orders`)
              : "POS In-Store Orders"}
            <Badge variant="secondary">{filteredOrders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">
                            Order #{order.id.slice(0, -4)}
                            <span className="font-bold text-lg">{order.id.slice(-4)}</span>
                          </h3>
                          <Badge className={getSellerStatusBadge(order.seller_status).color}>{getSellerStatusBadge(order.seller_status).text}</Badge>
                          {order.status === "delivered" && <Badge className="bg-green-100 text-green-800">Delivered</Badge>}
                          {order.status === "refunded" && <Badge className="bg-orange-100 text-orange-800">Refunded</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Restaurant: <span className="font-medium">{order.seller_name}</span>
                        </p>
                        {orderMode === "online" && order.status === "assigned" && order.delivery_partner && (
                          <p className="text-sm text-muted-foreground">
                            Delivery Partner: <span className="font-medium">{order.delivery_partner.name}</span> - {order.delivery_partner.mobile}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Total: <span className="font-medium">₹{order.total_amount}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {orderMode === "online" && order.seller_status === "packed" && order.status === "pending" && (
                          <Button size="sm" onClick={() => openAssignModal(order.id)}>Assign Order</Button>
                        )}
                        {order.seller_status === "rejected" && order.status !== "refunded" && (
                          <Badge className="bg-orange-100 text-orange-800">Auto refunding…</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeliveryPartnerAssignModal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} orderId={selectedOrderId || ""} onAssignSuccess={fetchOrders} />

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium text-primary">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller Status</p>
                  <Badge className={getSellerStatusBadge(selectedOrder.seller_status).color}>{getSellerStatusBadge(selectedOrder.seller_status).text}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="text-sm">{selectedOrder.delivery_address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <div className="space-y-1">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span>₹{item.seller_price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">₹{selectedOrder.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "dd MMM yyyy, hh:mm a")}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
