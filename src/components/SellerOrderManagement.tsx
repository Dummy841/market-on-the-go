import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { Package, Clock, CheckCircle, Truck, AlertCircle, User, MapPin, Eye, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Order {
  id: string;
  user_id: string;
  seller_name: string;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    seller_price: number;
  }>;
  total_amount: number;
  delivery_fee: number;
  platform_fee: number;
  gst_charges: number;
  delivery_address: string;
  instructions: string;
  payment_method: string;
  status: string;
  created_at: string;
  seller_accepted_at: string | null;
  seller_packed_at: string | null;
  delivered_at: string | null;
}

export const SellerOrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [dateFilter, setDateFilter] = useState("all");
  const { seller } = useSellerAuth();

  const dateOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" }
  ];

  const statusOptions = [
    {
      label: "All",
      value: "All", 
      icon: Package,
      color: "bg-muted"
    },
    {
      label: "Pending",
      value: "pending",
      icon: Clock,
      color: "bg-yellow-100 text-yellow-800"
    },
    {
      label: "Accepted",
      value: "accepted",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800"
    },
    {
      label: "Packed",
      value: "packed",
      icon: Package,
      color: "bg-blue-100 text-blue-800"
    },
    {
      label: "Delivered",
      value: "delivered",
      icon: Truck,
      color: "bg-purple-100 text-purple-800"
    }
  ];

  const fetchSellerOrders = async () => {
    if (!seller) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as any);
    } catch (error) {
      console.error('Error fetching seller orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerOrders();
  }, [seller]);

  const generatePickupPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, timestampField?: string) => {
    try {
      const updateData: any = { seller_status: newStatus };
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      // Generate pickup PIN when order is packed
      if (newStatus === 'packed') {
        const pickupPin = generatePickupPin();
        updateData.pickup_pin = pickupPin;
        console.log('Generating pickup PIN:', pickupPin, 'for order:', orderId);
        console.log('Update data:', updateData);
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Updated",
        description: `Order has been ${newStatus.replace('_', ' ')}`,
      });

      // Close the order details dialog after accepting or rejecting
      if (newStatus === 'accepted' || newStatus === 'rejected') {
        setShowOrderDetails(false);
        setSelectedOrder(null);
      }

      fetchSellerOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'seller_accepted': 
      case 'preparing': return <Package className="h-4 w-4" />;
      case 'packed':
      case 'out_for_delivery': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
      case 'seller_accepted':
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'packed':
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'New Order';
      case 'accepted': 
      case 'seller_accepted': return 'Accepted';
      case 'preparing': return 'Preparing';
      case 'packed': return 'Packed';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getActionButtons = (order: Order) => {
    const sellerStatus = (order as any).seller_status || 'pending';
    
    switch (sellerStatus) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateOrderStatus(order.id, 'accepted', 'seller_accepted_at')}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept Order
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateOrderStatus(order.id, 'rejected')}
            >
              Reject
            </Button>
          </div>
        );
      case 'accepted':
        return (
          <Button
            size="sm"
            onClick={() => updateOrderStatus(order.id, 'packed', 'seller_packed_at')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Mark as Packed
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const filteredOrders = selectedStatus === "All" ? orders : orders.filter(order => {
    const sellerStatus = (order as any).seller_status || 'pending';
    if (selectedStatus === "delivered") {
      // Check both main status and seller_status for delivered orders
      return order.status === "delivered" || sellerStatus === "delivered";
    }
    return sellerStatus === selectedStatus;
  }).filter(order => {
    // Date filtering for delivered orders
    if (selectedStatus === "delivered" && dateFilter !== "all") {
      const orderDate = new Date(order.delivered_at || order.created_at);
      switch (dateFilter) {
        case "today":
          return isToday(orderDate);
        case "week":
          return isThisWeek(orderDate);
        case "month":
          return isThisMonth(orderDate);
        default:
          return true;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Management
        </CardTitle>
      </CardHeader>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusOptions.map(status => {
          const Icon = status.icon;
          const count = status.value === "All" ? orders.length : (() => {
            if (status.value === "delivered") {
              return orders.filter(order => order.status === "delivered" || (order as any).seller_status === "delivered").length;
            }
            return orders.filter(order => {
              const sellerStatus = (order as any).seller_status || 'pending';
              return sellerStatus === status.value;
            }).length;
          })();
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

      {/* Date Filter for Delivered Orders */}
      {selectedStatus === "delivered" && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">
              No orders found for {selectedStatus.toLowerCase()} status.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                      <Badge className={getStatusColor((order as any).seller_status || 'pending')}>
                        {getStatusIcon((order as any).seller_status || 'pending')}
                        <span className="ml-1">{getStatusText((order as any).seller_status || 'pending')}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    {(order as any).pickup_pin && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        PIN {(order as any).pickup_pin}
                      </Badge>
                    )}
                    {(order as any).seller_status === 'packed' && !(order as any).pickup_pin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOrderStatus(order.id, 'packed')}
                      >
                        Generate PIN
                      </Button>
                    )}
                    <p className="font-semibold text-lg">₹{order.total_amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </p>
                  </div>
                </div>

                {/* Show Pickup PIN if order is packed */}
                {(order as any).seller_status === 'packed' && (order as any).pickup_pin && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Pickup PIN</p>
                        <p className="text-xs text-yellow-600">Share this PIN with delivery partner</p>
                      </div>
                      <div className="text-2xl font-bold text-yellow-800 bg-yellow-100 px-3 py-1 rounded">
                        {(order as any).pickup_pin}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Payment: {order.payment_method.toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderDetails(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    {getActionButtons(order)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge className={getStatusColor((selectedOrder as any).seller_status || 'pending')}>
                  {getStatusIcon((selectedOrder as any).seller_status || 'pending')}
                  <span className="ml-1">{getStatusText((selectedOrder as any).seller_status || 'pending')}</span>
                </Badge>
                <p className="font-semibold text-lg">₹{selectedOrder.total_amount}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Order Items:</h4>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span className="font-medium">₹{item.seller_price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Delivery Address:</span>
                </div>
                <p className="text-sm">{selectedOrder.delivery_address}</p>
              </div>
              
              {selectedOrder.instructions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Special Instructions:</span>
                  </div>
                  <p className="text-sm">{selectedOrder.instructions}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Payment: {selectedOrder.payment_method.toUpperCase()}
                </div>
                {getActionButtons(selectedOrder)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};