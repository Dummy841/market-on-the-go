import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { toZonedTime } from 'date-fns-tz';
import { Package, Clock, CheckCircle, Truck, AlertCircle, RotateCcw, Eye, Search, Calendar } from "lucide-react";
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

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [usersMap, setUsersMap] = useState<Map<string, UserInfo>>(new Map());

  const IST = 'Asia/Kolkata';
  const getTodayIST = () => format(toZonedTime(new Date(), IST), 'yyyy-MM-dd');
  const todayIST = getTodayIST();

  const statusOptions = [{
    label: "All",
    value: "All",
    icon: Package,
    color: "bg-muted"
  }, {
    label: "Pending",
    value: "pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800"
  }, {
    label: "Assigned",
    value: "assigned",
    icon: Truck,
    color: "bg-blue-100 text-blue-800"
  }, {
    label: "Delivered",
    value: "delivered",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800"
  }];

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('orders').select(`
        *,
        delivery_partner:assigned_delivery_partner_id (
          name,
          mobile
        )
      `).order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []) as any);
      
      // Fetch all users for search by name
      const { data: usersData } = await supabase.from('users').select('id, name, mobile');
      if (usersData) {
        const map = new Map<string, UserInfo>();
        usersData.forEach((u: any) => map.set(u.id, u));
        setUsersMap(map);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('orders').update({
        status: newStatus
      }).eq('id', orderId);
      if (error) throw error;
      await fetchOrders();
      toast({
        title: "Success",
        description: "Order status updated successfully"
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const processRefund = async (order: Order) => {
    try {
      setRefundingOrderId(order.id);
      
      const response = await supabase.functions.invoke('process-razorpay-refund', {
        body: {
          order_id: order.id,
          amount: order.total_amount
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Refund failed');
      }

      const data = response.data;
      
      if (data.success) {
        toast({
          title: "Refund Processed",
          description: data.refund_id 
            ? `Refund ID: ${data.refund_id} - ₹${data.amount} refunded`
            : "Order marked as refunded"
        });
        await fetchOrders();
      } else {
        throw new Error(data.error || 'Refund failed');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: "Refund Failed",
        description: error instanceof Error ? error.message : "Failed to process refund",
        variant: "destructive"
      });
    } finally {
      setRefundingOrderId(null);
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('id', order.user_id)
        .single();
      setCustomerName(data?.name || 'N/A');
    } catch {
      setCustomerName('N/A');
    }
  };

  useEffect(() => {
    fetchOrders();
    
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Admin order update:', payload);
          if (payload.eventType === 'INSERT') {
            fetchOrders();
            toast({
              title: "New Order",
              description: `New order received from ${(payload.new as any).seller_name}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(order => 
              order.id === (payload.new as any).id ? { ...order, ...payload.new as any } : order
            ));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get orders filtered by date
  const getOrdersForDate = (date: string) => {
    return orders.filter(order => {
      const orderDateIST = format(toZonedTime(new Date(order.created_at), IST), 'yyyy-MM-dd');
      return orderDateIST === date;
    });
  };
  
  const dateFilteredOrders = dateFilter ? getOrdersForDate(dateFilter) : orders;

  // Filter orders by status, search, and date
  const filteredOrders = orders.filter(order => {
    // Date filter
    if (dateFilter) {
      const orderDateIST = format(toZonedTime(new Date(order.created_at), IST), 'yyyy-MM-dd');
      if (orderDateIST !== dateFilter) return false;
    }
    
    // Status filter
    if (selectedStatus !== "All" && order.status !== selectedStatus) {
      return false;
    }
    
    // Search filter (order ID, customer mobile, or customer name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesOrderId = order.id.toLowerCase().includes(query);
      const matchesMobile = order.delivery_mobile?.toLowerCase().includes(query);
      const user = usersMap.get(order.user_id);
      const matchesName = user?.name?.toLowerCase().includes(query);
      if (!matchesOrderId && !matchesMobile && !matchesName) {
        return false;
      }
    }
    
    return true;
  });
  
  // Get status count based on date filter
  const getStatusCount = (statusVal: string) => {
    if (statusVal === "All") return dateFilteredOrders.length;
    return dateFilteredOrders.filter(order => order.status === statusVal).length;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSellerStatusBadge = (sellerStatus: string) => {
    switch (sellerStatus) {
      case 'accepted':
        return { color: 'bg-green-100 text-green-800', text: 'Accepted' };
      case 'packed':
        return { color: 'bg-blue-100 text-blue-800', text: 'Packed' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', text: 'Rejected' };
      default:
        return { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' };
    }
  };

  const openAssignModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    fetchOrders();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Orders Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Orders Management</h2>
      
      {/* Status Filter Cards - based on date filtered orders */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {statusOptions.map(status => {
          const Icon = status.icon;
          const count = getStatusCount(status.value);
          return (
            <Card 
              key={status.value} 
              className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === status.value ? 'ring-2 ring-primary shadow-md' : ''}`} 
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

      {/* Search and Date Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Order ID, Mobile, or Customer Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto h-8"
              />
              {dateFilter && dateFilter !== todayIST && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setDateFilter(todayIST)}>
                  Today
                </Button>
              )}
              {dateFilter && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setDateFilter('')}>
                  All
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {selectedStatus === "All" ? "All Orders" : `${selectedStatus} Orders`}
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
              {filteredOrders.map(order => (
                <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">Order #{order.id.slice(0, -4)}<span className="font-bold text-lg">{order.id.slice(-4)}</span></h3>
                          <Badge className={getSellerStatusBadge(order.seller_status).color}>
                            {getSellerStatusBadge(order.seller_status).text}
                          </Badge>
                          {order.status === 'delivered' && (
                            <Badge className="bg-green-100 text-green-800">
                              Delivered
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Restaurant: <span className="font-medium">{order.seller_name}</span>
                        </p>
                        {order.status === 'assigned' && order.delivery_partner && (
                          <p className="text-sm text-muted-foreground">
                            Delivery Partner: <span className="font-medium">{order.delivery_partner.name}</span> - {order.delivery_partner.mobile}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Total: <span className="font-medium">₹{order.total_amount}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        {order.seller_status === 'packed' && order.status === 'pending' && (
                          <Button size="sm" onClick={() => openAssignModal(order.id)}>
                            Assign Order
                          </Button>
                        )}
                        {order.seller_status === 'rejected' && order.status !== 'refunded' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            onClick={() => processRefund(order)}
                            disabled={refundingOrderId === order.id}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            {refundingOrderId === order.id ? 'Processing...' : 'Refund'}
                          </Button>
                        )}
                        {order.status === 'refunded' && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Refunded
                          </Badge>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDetails(order)}
                        >
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

      <DeliveryPartnerAssignModal 
        isOpen={assignModalOpen} 
        onClose={() => setAssignModalOpen(false)} 
        orderId={selectedOrderId || ""} 
        onAssignSuccess={handleAssignSuccess} 
      />

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium text-primary">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getSellerStatusBadge(selectedOrder.seller_status).color}>
                    {getSellerStatusBadge(selectedOrder.seller_status).text}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Customer Details</p>
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="font-medium">{customerName}</p>
                  <p className="text-sm">{selectedOrder.delivery_mobile || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span>₹{(Number(item.franchise_price) * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{Number(selectedOrder.total_amount).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Delivery Address</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">{selectedOrder.delivery_address}</p>
                </div>
              </div>

              {selectedOrder.instructions && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Instructions</p>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{selectedOrder.instructions}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {format(new Date(selectedOrder.created_at), 'dd MMM yyyy, hh:mm a')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
