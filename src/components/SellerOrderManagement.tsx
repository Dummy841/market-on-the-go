import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth, format } from "date-fns";
import { toZonedTime } from 'date-fns-tz';
import { Package, Clock, CheckCircle, Truck, AlertCircle, User, Eye, Filter, Volume2, Search, Calendar } from "lucide-react";
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

// Create a persistent audio element for background tab support
let notificationAudio: HTMLAudioElement | null = null;
let audioIntervalId: NodeJS.Timeout | null = null;
const ringingOrderIds = new Set<string>();

// Generate notification sound as data URL (works in background tabs)
const generateNotificationDataUrl = (): string => {
  // Create audio context to generate sound
  const sampleRate = 24000;
  const duration = 2; // 2 seconds
  const numSamples = sampleRate * duration;

  // Create buffer for WAV file
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate Rapido-style ringtone pattern
  const frequencies = [{
    freq: 784,
    start: 0,
    end: 0.15
  }, {
    freq: 880,
    start: 0.15,
    end: 0.3
  }, {
    freq: 988,
    start: 0.3,
    end: 0.45
  }, {
    freq: 1047,
    start: 0.45,
    end: 0.65
  }, {
    freq: 988,
    start: 0.75,
    end: 0.87
  }, {
    freq: 1047,
    start: 0.87,
    end: 0.99
  }, {
    freq: 1175,
    start: 0.99,
    end: 1.11
  }, {
    freq: 1319,
    start: 1.11,
    end: 1.36
  }, {
    freq: 1047,
    start: 1.45,
    end: 1.57
  }, {
    freq: 1319,
    start: 1.57,
    end: 1.69
  }, {
    freq: 1568,
    start: 1.69,
    end: 1.99
  }];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const tone of frequencies) {
      if (t >= tone.start && t < tone.end) {
        const toneT = t - tone.start;
        const toneDuration = tone.end - tone.start;
        // Envelope: fade in and out
        const envelope = Math.min(toneT / 0.02, 1) * Math.min((toneDuration - toneT) / 0.02, 1);
        sample = Math.sin(2 * Math.PI * tone.freq * t) * 0.5 * envelope;
        break;
      }
    }
    const int16Sample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, int16Sample, true);
  }

  // Convert to base64 data URL
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

// Initialize audio element once
const getNotificationAudio = (): HTMLAudioElement => {
  if (!notificationAudio) {
    notificationAudio = new Audio(generateNotificationDataUrl());
    notificationAudio.volume = 1;
  }
  return notificationAudio;
};

// Start continuous ringing for an order
const startRinging = (orderId: string) => {
  ringingOrderIds.add(orderId);
  console.log('Started ringing for order:', orderId, 'Total ringing:', ringingOrderIds.size);
  if (audioIntervalId) return; // Already ringing

  const audio = getNotificationAudio();
  const playSound = () => {
    if (ringingOrderIds.size === 0) {
      if (audioIntervalId) {
        clearInterval(audioIntervalId);
        audioIntervalId = null;
      }
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Audio play error:', err));
  };

  // Play immediately
  playSound();

  // Repeat every 3 seconds (2 sec sound + 1 sec pause)
  audioIntervalId = setInterval(playSound, 3000);
};

// Stop ringing for an order
const stopRinging = (orderId: string) => {
  ringingOrderIds.delete(orderId);
  console.log('Stopped ringing for order:', orderId, 'Remaining:', ringingOrderIds.size);
  if (ringingOrderIds.size === 0 && audioIntervalId) {
    clearInterval(audioIntervalId);
    audioIntervalId = null;
    if (notificationAudio) {
      notificationAudio.pause();
      notificationAudio.currentTime = 0;
    }
    console.log('All ringing stopped');
  }
};

// Stop all ringing
const stopAllRinging = () => {
  ringingOrderIds.clear();
  if (audioIntervalId) {
    clearInterval(audioIntervalId);
    audioIntervalId = null;
  }
  if (notificationAudio) {
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
  }
};
export const SellerOrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState("");
  const {
    seller
  } = useSellerAuth();
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const processedOrderIdsRef = useRef<Set<string>>(new Set());
  
  // IST timezone
  const IST = 'Asia/Kolkata';
  const getTodayIST = () => format(toZonedTime(new Date(), IST), 'yyyy-MM-dd');
  
  // Get orders for a specific date (for stats)
  const getOrdersForDate = (date: string) => {
    return orders.filter(order => {
      const orderDateIST = format(toZonedTime(new Date(order.created_at), IST), 'yyyy-MM-dd');
      return orderDateIST === date;
    });
  };
  
  const todayIST = getTodayIST();
  const dateFilteredOrders = dateFilter ? getOrdersForDate(dateFilter) : orders;
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
    label: "Accepted",
    value: "accepted",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800"
  }, {
    label: "Packed",
    value: "packed",
    icon: Package,
    color: "bg-blue-100 text-blue-800"
  }, {
    label: "Delivered",
    value: "delivered",
    icon: Truck,
    color: "bg-purple-100 text-purple-800"
  }, {
    label: "Rejected",
    value: "rejected",
    icon: AlertCircle,
    color: "bg-red-100 text-red-800"
  }];
  const fetchSellerOrders = useCallback(async () => {
    if (!seller) return;
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('orders').select('*').eq('seller_id', seller.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const ordersData = (data || []) as any;

      // Store current order IDs for comparison
      ordersData.forEach((order: Order) => {
        previousOrderIdsRef.current.add(order.id);
      });
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching seller orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [seller]);

  // Initial fetch
  useEffect(() => {
    fetchSellerOrders();
  }, [fetchSellerOrders]);

  // Start ringing for existing pending orders on load
  useEffect(() => {
    orders.forEach(order => {
      const sellerStatus = (order as any).seller_status || 'pending';
      if (sellerStatus === 'pending' && !processedOrderIdsRef.current.has(order.id)) {
        processedOrderIdsRef.current.add(order.id);
        startRinging(order.id);
      }
    });
  }, [orders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllRinging();
    };
  }, []);

  // Real-time subscription for new orders
  useEffect(() => {
    if (!seller) return;
    console.log('Setting up real-time subscription for seller:', seller.id);
    const channel = supabase.channel('seller-orders-realtime').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `seller_id=eq.${seller.id}`
    }, payload => {
      console.log('New order received:', payload);
      const newOrder = payload.new as Order;

      // Check if this is truly a new order we haven't seen
      if (!previousOrderIdsRef.current.has(newOrder.id)) {
        previousOrderIdsRef.current.add(newOrder.id);

        // Add new order to the list
        setOrders(prev => [newOrder, ...prev]);

        // Start continuous ringing for pending order
        const sellerStatus = (newOrder as any).seller_status || 'pending';
        if (sellerStatus === 'pending') {
          startRinging(newOrder.id);
        }

        // Show toast notification
        toast({
          title: "🔔 New Order Received!",
          description: `Order #${newOrder.id.slice(-4)} - ₹${newOrder.total_amount}`
        });

        // Auto-switch to pending tab to show new order
        setSelectedStatus("pending");
      }
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `seller_id=eq.${seller.id}`
    }, payload => {
      console.log('Order updated:', payload);
      const updatedOrder = payload.new as Order;
      const sellerStatus = (updatedOrder as any).seller_status || 'pending';

      // Stop ringing if order is no longer pending
      if (sellerStatus !== 'pending') {
        stopRinging(updatedOrder.id);
      }

      // Update the order in the list
      setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
    }).subscribe(status => {
      console.log('Subscription status:', status);
    });
    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [seller]);
  const generatePickupPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };
  const updateOrderStatus = async (orderId: string, newStatus: string, timestampField?: string) => {
    try {
      // Stop ringing immediately when accepting or rejecting
      if (newStatus === 'accepted' || newStatus === 'rejected') {
        stopRinging(orderId);
      }
      const updateData: any = {
        seller_status: newStatus
      };
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

      // Handle rejection - credit user wallet via edge function
      if (newStatus === 'rejected') {
        const { data: refundResult, error: refundError } = await supabase.functions.invoke('refund-rejected-order', {
          body: { order_id: orderId }
        });

        if (refundError || !refundResult?.success) {
          console.error('Refund edge function error:', refundError || refundResult);
          throw new Error(refundError?.message || refundResult?.error || 'Failed to refund to wallet');
        }

        // Update order status to refunded
        updateData.status = 'refunded';
        updateData.refund_id = refundResult.refund_id || `WALLET_${Date.now()}`;
      }

      const {
        error
      } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      toast({
        title: "Order Updated",
        description: `Order has been ${newStatus.replace('_', ' ')}${newStatus === 'rejected' ? ' - Amount credited to user wallet' : ''}`
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
        variant: "destructive"
      });
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'seller_accepted':
      case 'preparing':
        return <Package className="h-4 w-4" />;
      case 'packed':
      case 'out_for_delivery':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
      case 'seller_accepted':
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'packed':
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'New Order';
      case 'accepted':
      case 'seller_accepted':
        return 'Accepted';
      case 'preparing':
        return 'Preparing';
      case 'packed':
        return 'Packed';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };
  const getActionButtons = (order: Order) => {
    const sellerStatus = (order as any).seller_status || 'pending';
    switch (sellerStatus) {
      case 'pending':
        return <div className="flex gap-2">
            <Button size="sm" onClick={() => updateOrderStatus(order.id, 'accepted', 'seller_accepted_at')} className="bg-green-600 hover:bg-green-700">
              Accept Order
            </Button>
            <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'rejected')}>
              Reject
            </Button>
          </div>;
      case 'accepted':
        return <Button size="sm" onClick={() => updateOrderStatus(order.id, 'packed', 'seller_packed_at')} className="bg-purple-600 hover:bg-purple-700">
            Mark as Packed
          </Button>;
      default:
        return null;
    }
  };
  if (loading) {
    return <div className="space-y-4">
        {[1, 2, 3].map(i => <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>)}
      </div>;
  }
  // Filter orders by status + search + date
  const filteredOrders = orders.filter(order => {
    const sellerStatus = (order as any).seller_status || 'pending';
    
    // Date filter (applies to all)
    if (dateFilter) {
      const orderDateIST = format(toZonedTime(new Date(order.created_at), IST), 'yyyy-MM-dd');
      if (orderDateIST !== dateFilter) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesOrderId = order.id.toLowerCase().includes(query);
      if (!matchesOrderId) return false;
    }
    
    // Status filter
    if (selectedStatus === "All") return true;
    if (selectedStatus === "delivered") {
      return order.status === "delivered" || sellerStatus === "delivered";
    }
    if (selectedStatus === "rejected") {
      return order.status === "rejected" || sellerStatus === "rejected";
    }
    if (selectedStatus === "packed") {
      return sellerStatus === "packed" && order.status !== "delivered";
    }
    return sellerStatus === selectedStatus;
  });
  
  // Stats based on date filter
  const getStatusCount = (statusVal: string) => {
    if (statusVal === "All") return dateFilteredOrders.length;
    if (statusVal === "delivered") {
      return dateFilteredOrders.filter(order => order.status === "delivered" || (order as any).seller_status === "delivered").length;
    }
    if (statusVal === "rejected") {
      return dateFilteredOrders.filter(order => order.status === "rejected" || (order as any).seller_status === "rejected").length;
    }
    if (statusVal === "packed") {
      return dateFilteredOrders.filter(order => (order as any).seller_status === "packed" && order.status !== "delivered").length;
    }
    return dateFilteredOrders.filter(order => {
      const sellerStatus = (order as any).seller_status || 'pending';
      return sellerStatus === statusVal;
    }).length;
  };
  
  return <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Management
        </CardTitle>
      </CardHeader>

      {/* Search and Date Filter */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Order ID..."
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
              className="h-8 w-auto"
            />
            {dateFilter && dateFilter !== todayIST && (
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setDateFilter(todayIST)}>
                Today
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Status Filter Cards - Using dateFilteredOrders for count */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {statusOptions.map(status => {
        const Icon = status.icon;
        const count = getStatusCount(status.value);
        return <Card key={status.value} className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === status.value ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => setSelectedStatus(status.value)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">{status.label}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      {filteredOrders.length === 0 ? <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">
              No orders found for {selectedStatus.toLowerCase()} status.
            </p>
          </CardContent>
        </Card> : <div className="space-y-4">
          {filteredOrders.map(order => <Card key={order.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Order #{order.id.slice(0, -4)}<span className="font-bold text-lg">{order.id.slice(-4)}</span></h3>
                      <Badge className={getStatusColor((order as any).seller_status || 'pending')}>
                        {getStatusIcon((order as any).seller_status || 'pending')}
                        <span className="ml-1">{getStatusText((order as any).seller_status || 'pending')}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(order.created_at), {
                  addSuffix: true
                })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    {(order as any).pickup_pin && <Badge variant="secondary" className="font-mono text-xs">
                        PIN {(order as any).pickup_pin}
                      </Badge>}
                    {(order as any).seller_status === 'packed' && !(order as any).pickup_pin && <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'packed')}>
                        Generate PIN
                      </Button>}
                    
                    <p className="text-xs text-muted-foreground">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </p>
                  </div>
                </div>

                {/* Show Pickup PIN if order is packed */}
                {(order as any).seller_status === 'packed' && (order as any).pickup_pin}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Payment: {order.payment_method.toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                setSelectedOrder(order);
                setShowOrderDetails(true);
              }}>
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    {getActionButtons(order)}
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>}

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge className={getStatusColor((selectedOrder as any).seller_status || 'pending')}>
                  {getStatusIcon((selectedOrder as any).seller_status || 'pending')}
                  <span className="ml-1">{getStatusText((selectedOrder as any).seller_status || 'pending')}</span>
                </Badge>
                
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Order Items:</h4>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, index) => <div key={index} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span className="font-medium">₹{item.seller_price * item.quantity}</span>
                    </div>)}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                
                
              </div>
              
              {selectedOrder.instructions && <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Special Instructions:</span>
                  </div>
                  <p className="text-sm">{selectedOrder.instructions}</p>
                </div>}
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Payment: {selectedOrder.payment_method.toUpperCase()}
                </div>
                {getActionButtons(selectedOrder)}
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};