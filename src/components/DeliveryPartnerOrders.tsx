import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { Package, MapPin, Phone, CreditCard, AlertCircle, Navigation, Filter, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PinVerificationModal } from "./PinVerificationModal";
import { DeliveryPinVerificationModal } from "./DeliveryPinVerificationModal";
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
  delivery_address: string;
  instructions: string;
  payment_method: string;
  status: string;
  seller_status: string;
  pickup_status: string;
  pickup_pin: string;
  delivery_pin: string;
  assigned_at: string;
  created_at: string;
  pickup_at: string;
  going_for_pickup_at: string;
  going_for_delivery_at: string;
  delivered_at: string;
}
interface DeliveryPartnerOrdersProps {
  partnerId: string;
}
const DeliveryPartnerOrders = ({
  partnerId
}: DeliveryPartnerOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [deliveryPinModalOpen, setDeliveryPinModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expectedPin, setExpectedPin] = useState("");
  const [expectedDeliveryPin, setExpectedDeliveryPin] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const {
    toast
  } = useToast();
  const statusOptions = [{
    value: "all",
    label: "All Orders",
    icon: Package
  }, {
    value: "pending",
    label: "Pending Orders",
    icon: Clock
  }, {
    value: "delivered",
    label: "Delivered Orders",
    icon: CheckCircle
  }];
  const dateOptions = [{
    value: "all",
    label: "All Time"
  }, {
    value: "today",
    label: "Today"
  }, {
    value: "week",
    label: "This Week"
  }, {
    value: "month",
    label: "This Month"
  }];
  const fetchAssignedOrders = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('orders').select('*').eq('assigned_delivery_partner_id', partnerId).order('assigned_at', {
        ascending: false
      });
      if (error) throw error;
      setOrders((data || []) as any);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assigned orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const updateOrderStatus = async (orderId: string, newStatus: string, pickupStatus?: string) => {
    try {
      const updateData: any = {
        status: newStatus
      };
      if (pickupStatus) {
        updateData.pickup_status = pickupStatus;
      }
      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      if (pickupStatus === 'going_for_pickup') {
        updateData.going_for_pickup_at = new Date().toISOString();
      }
      if (pickupStatus === 'picked_up') {
        updateData.pickup_at = new Date().toISOString();
      }
      if (pickupStatus === 'going_for_delivery') {
        updateData.going_for_delivery_at = new Date().toISOString();
      }
      const {
        error
      } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      await fetchAssignedOrders();
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
  const handlePickupSuccess = () => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, 'out_for_delivery', 'picked_up');
    }
  };
  const handleDeliverySuccess = () => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, 'delivered');
    }
  };
  const navigateToSeller = async (order: Order) => {
    try {
      const {
        data: seller,
        error
      } = await supabase.from('sellers').select('seller_latitude, seller_longitude').eq('id', order.seller_id).maybeSingle();
      if (error) throw error;
      if (seller?.seller_latitude && seller?.seller_longitude) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${seller.seller_latitude},${seller.seller_longitude}`, '_blank');
        updateOrderStatus(order.id, 'assigned', 'going_for_pickup');
      } else {
        toast({
          title: 'Location unavailable',
          description: 'Seller location is not set for navigation.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      console.error('Error fetching seller location:', e);
      toast({
        title: 'Error',
        description: 'Could not get seller location',
        variant: 'destructive'
      });
    }
  };
  const navigateToCustomer = (order: Order) => {
    if ((order as any).delivery_latitude && (order as any).delivery_longitude) {
      const lat = (order as any).delivery_latitude;
      const lng = (order as any).delivery_longitude;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      updateOrderStatus(order.id, 'out_for_delivery', 'going_for_delivery');
    }
  };
  const openPinModal = async (order: Order) => {
    try {
      const {
        data,
        error
      } = await supabase.from('orders').select('pickup_pin').eq('id', order.id).maybeSingle();
      if (error) throw error;
      const pin = (data as any)?.pickup_pin;
      if (pin) {
        setExpectedPin(String(pin));
        setSelectedOrder(order);
        setPinModalOpen(true);
      } else {
        toast({
          title: 'PIN not available',
          description: 'Ask the seller to share or regenerate the pickup PIN.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      console.error('Error fetching PIN:', e);
      toast({
        title: 'Error',
        description: 'Could not fetch latest PIN',
        variant: 'destructive'
      });
    }
  };
  const openDeliveryPinModal = async (order: Order) => {
    try {
      const {
        data,
        error
      } = await supabase.from('orders').select('delivery_pin').eq('id', order.id).maybeSingle();
      if (error) throw error;
      const pin = (data as any)?.delivery_pin;
      if (pin) {
        setExpectedDeliveryPin(String(pin));
        setSelectedOrder(order);
        setDeliveryPinModalOpen(true);
      } else {
        toast({
          title: 'Delivery PIN not available',
          description: 'Delivery PIN has not been generated yet.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      console.error('Error fetching delivery PIN:', e);
      toast({
        title: 'Error',
        description: 'Could not fetch delivery PIN',
        variant: 'destructive'
      });
    }
  };
  const getStatusBadgeColor = (status: string, pickupStatus?: string) => {
    if (pickupStatus) {
      switch (pickupStatus) {
        case 'assigned':
          return 'bg-blue-100 text-blue-800';
        case 'going_for_pickup':
          return 'bg-yellow-100 text-yellow-800';
        case 'picked_up':
          return 'bg-purple-100 text-purple-800';
        case 'going_for_delivery':
          return 'bg-orange-100 text-orange-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
    switch (status) {
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
  const getPickupStatusText = (pickupStatus: string) => {
    switch (pickupStatus) {
      case 'assigned':
        return 'Assigned';
      case 'going_for_pickup':
        return 'Going for Pickup';
      case 'picked_up':
        return 'Picked Up';
      case 'going_for_delivery':
        return 'Going for Delivery';
      default:
        return pickupStatus?.replace('_', ' ') || 'Assigned';
    }
  };
  useEffect(() => {
    fetchAssignedOrders();
  }, [partnerId]);
  if (loading) {
    return <div className="space-y-4">
        {[1, 2, 3].map(i => <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>)}
      </div>;
  }
  const filteredOrders = orders.filter(order => {
    // Status filtering
    if (statusFilter === "pending") {
      return order.status !== "delivered";
    } else if (statusFilter === "delivered") {
      return order.status === "delivered";
    }

    // If "all" is selected, don't filter by status
    return true;
  }).filter(order => {
    // Date filtering for delivered orders
    if (statusFilter === "delivered" && dateFilter !== "all") {
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
  if (filteredOrders.length === 0) {
    return <div className="space-y-4">
        {/* Status Filter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusOptions.map(status => {
          const Icon = status.icon;
          const count = status.value === "all" ? orders.length : status.value === "pending" ? orders.filter(o => o.status !== "delivered").length : orders.filter(o => o.status === "delivered").length;
          return <Card key={status.value} className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === status.value ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setStatusFilter(status.value)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{status.label}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>;
        })}
        </div>

        {/* Date Filter for Delivered Orders */}
        {statusFilter === "delivered" && <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map(option => <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>}
        
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No {statusFilter === "all" ? "" : statusFilter} orders found
              {statusFilter === "delivered" && dateFilter !== "all" ? ` for ${dateFilter}` : ""}
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-4">
      {/* Status Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusOptions.map(status => {
        const Icon = status.icon;
        const count = status.value === "all" ? orders.length : status.value === "pending" ? orders.filter(o => o.status !== "delivered").length : orders.filter(o => o.status === "delivered").length;
        return <Card key={status.value} className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === status.value ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setStatusFilter(status.value)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{status.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Date Filter for Delivered Orders */}
      {statusFilter === "delivered" && <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map(option => <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>}
      
      {filteredOrders.map(order => <Card key={order.id} className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Order #{order.id.slice(0, -4)}<span className="font-bold text-lg">{order.id.slice(-4)}</span></span>
                <Badge className={getStatusBadgeColor(order.status, order.pickup_status)}>
                  {order.pickup_status ? getPickupStatusText(order.pickup_status) : order.status.replace('_', ' ')}
                </Badge>
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                ₹{order.total_amount}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Restaurant</p>
              <p className="font-medium">{order.seller_name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Items ({order.items.length})</p>
              <div className="space-y-1">
                {order.items.map((item, index) => <div key={index} className="flex justify-between text-sm">
                    <span>{item.item_name} × {item.quantity}</span>
                    
                  </div>)}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="text-sm">{order.delivery_address}</p>
              </div>
            </div>

            {order.instructions && <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Special Instructions</p>
                  <p className="text-sm">{order.instructions}</p>
                </div>
              </div>}

            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Payment: {order.payment_method.toUpperCase()}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Assigned {formatDistanceToNow(new Date(order.assigned_at), {
            addSuffix: true
          })}
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              {/* Pickup Workflow States */}
              {(!order.pickup_status || order.pickup_status === 'assigned') && order.seller_status === 'packed' && <Button size="sm" onClick={() => navigateToSeller(order)} className="bg-blue-600 hover:bg-blue-700">
                  <MapPin className="h-4 w-4 mr-1" />
                  Go for Pickup
                </Button>}

              {order.pickup_status === 'going_for_pickup' && <>
                  <Button size="sm" onClick={() => openPinModal(order)} className="bg-green-600 hover:bg-green-700">
                    <Package className="h-4 w-4 mr-1" />
                    Pickup
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigateToSeller(order)} className="border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Navigation className="h-4 w-4 mr-1" />
                    Navigate
                  </Button>
                </>}

              {order.pickup_status === 'picked_up' && order.status === 'out_for_delivery' && <>
                  <Button size="sm" onClick={() => navigateToCustomer(order)} className="bg-orange-600 hover:bg-orange-700">
                    <MapPin className="h-4 w-4 mr-1" />
                    Go to Delivery
                  </Button>
                </>}

              {order.pickup_status === 'going_for_delivery' && order.status === 'out_for_delivery' && <>
                  <Button size="sm" onClick={() => openDeliveryPinModal(order)} className="bg-green-600 hover:bg-green-700">
                    Mark Delivered
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigateToCustomer(order)} className="border-green-600 text-green-600 hover:bg-green-50">
                    <Navigation className="h-4 w-4 mr-1" />
                    Navigate
                  </Button>
                </>}

              <Button variant="outline" size="sm" onClick={() => {
            toast({
              title: "Contact Customer",
              description: "Feature coming soon..."
            });
          }}>
                <Phone className="h-4 w-4 mr-1" />
                Contact
              </Button>
            </div>
          </CardContent>
        </Card>)}
      
      {/* PIN Verification Modal */}
      {selectedOrder && <PinVerificationModal open={pinModalOpen} onOpenChange={setPinModalOpen} expectedPin={expectedPin || (selectedOrder?.pickup_pin ?? '')} onSuccess={handlePickupSuccess} orderNumber={selectedOrder.id} />}
      
      {/* Delivery PIN Verification Modal */}
      {selectedOrder && <DeliveryPinVerificationModal open={deliveryPinModalOpen} onOpenChange={setDeliveryPinModalOpen} expectedPin={expectedDeliveryPin || (selectedOrder?.delivery_pin ?? '')} onSuccess={handleDeliverySuccess} orderNumber={selectedOrder.id} />}
    </div>;
};
export default DeliveryPartnerOrders;