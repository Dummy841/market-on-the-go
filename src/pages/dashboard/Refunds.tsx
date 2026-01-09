import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { RotateCcw, AlertCircle, CheckCircle, XCircle, Eye, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  }>;
  total_amount: number;
  delivery_fee: number;
  platform_fee: number;
  gst_charges: number;
  delivery_address: string;
  instructions: string;
  payment_method: string;
  status: string;
  seller_status: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    mobile: string;
  };
}

const Refunds = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const statusOptions = [
    {
      label: "All Rejected",
      value: "All",
      icon: XCircle,
      color: "bg-muted"
    },
    {
      label: "Refunded to Wallet",
      value: "refunded",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800"
    }
  ];

  const fetchRejectedOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_status', 'rejected')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user details for each order
      const ordersWithUsers = await Promise.all((data || []).map(async (order) => {
        const { data: userData } = await supabase
          .from('users')
          .select('name, mobile')
          .eq('id', order.user_id)
          .maybeSingle();
        return { ...order, user: userData };
      }));
      
      setOrders(ordersWithUsers as any);
    } catch (error) {
      console.error('Error fetching rejected orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rejected orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejectedOrders();
  }, []);

  const filteredOrders = selectedStatus === "All" 
    ? orders 
    : orders.filter(order => order.status === 'refunded');

  const refundedCount = orders.filter(order => order.status === 'refunded').length;

  const getRefundStatusBadge = (status: string) => {
    if (status === 'refunded') {
      return { color: 'bg-green-100 text-green-800', text: 'Refunded to Wallet', icon: CheckCircle };
    }
    return { color: 'bg-yellow-100 text-yellow-800', text: 'Processing...', icon: Wallet };
  };

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Refunds Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
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
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Refunds Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Refunds are automatically credited to user wallets when sellers reject orders
        </p>
      </div>
      
      {/* Status Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statusOptions.map(status => {
          const Icon = status.icon;
          let count = 0;
          if (status.value === "All") count = orders.length;
          else if (status.value === "refunded") count = refundedCount;

          return (
            <Card 
              key={status.value} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedStatus === status.value ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => setSelectedStatus(status.value)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{status.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rejected Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {selectedStatus === "All" ? "All Rejected Orders" : "Refunded Orders"}
            <Badge variant="secondary">{filteredOrders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No rejected orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => {
                const refundStatus = getRefundStatusBadge(order.status);
                const RefundIcon = refundStatus.icon;
                
                return (
                  <Card key={order.id} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">
                              Order #{order.id.slice(0, -4)}
                              <span className="font-bold text-lg">{order.id.slice(-4)}</span>
                            </h3>
                            <Badge className="bg-red-100 text-red-800">
                              Rejected
                            </Badge>
                            <Badge className={refundStatus.color}>
                              <RefundIcon className="h-3 w-3 mr-1" />
                              {refundStatus.text}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Restaurant: <span className="font-medium">{order.seller_name}</span>
                          </p>
                          {order.user && (
                            <p className="text-sm text-muted-foreground">
                              Customer: <span className="font-medium">{order.user.name}</span> - {order.user.mobile}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Items: {order.items.map(item => `${item.item_name} x${item.quantity}`).join(', ')}
                          </p>
                          <div className="flex items-center gap-4">
                            <p className="text-sm text-muted-foreground">
                              Total: <span className="font-medium text-foreground">₹{order.total_amount}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Payment: <span className="font-medium">{order.payment_method.toUpperCase()}</span>
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ordered {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openDetails(order)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getRefundStatusBadge(selectedOrder.status).color}>
                    {getRefundStatusBadge(selectedOrder.status).text}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Restaurant</p>
                <p className="font-medium">{selectedOrder.seller_name}</p>
              </div>

              {selectedOrder.user && (
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.user.name} - {selectedOrder.user.mobile}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="font-medium">{selectedOrder.delivery_address}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span>₹{item.seller_price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.total_amount - selectedOrder.delivery_fee - selectedOrder.platform_fee - selectedOrder.gst_charges}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>₹{selectedOrder.delivery_fee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Platform Fee</span>
                  <span>₹{selectedOrder.platform_fee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST</span>
                  <span>₹{selectedOrder.gst_charges}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Amount</span>
                  <span>₹{selectedOrder.total_amount}</span>
                </div>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Order Date</span>
                <span>{format(new Date(selectedOrder.created_at), 'PPp')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Refunds;