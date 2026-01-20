import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { Package, MapPin, Phone, AlertCircle, Navigation, Clock, CheckCircle, MessageSquare, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PinVerificationModal } from "./PinVerificationModal";
import { DeliveryPinVerificationModal } from "./DeliveryPinVerificationModal";
import DeliveryCustomerChat from "./DeliveryCustomerChat";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import VoiceCallModal from "./VoiceCallModal";
import { cn } from "@/lib/utils";

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
  partnerName?: string;
}
const DeliveryPartnerOrders = ({
  partnerId,
  partnerName = "Delivery Partner"
}: DeliveryPartnerOrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [deliveryPinModalOpen, setDeliveryPinModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expectedPin, setExpectedPin] = useState("");
  const [expectedDeliveryPin, setExpectedDeliveryPin] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatOrderId, setChatOrderId] = useState("");
  const [chatUserId, setChatUserId] = useState("");
  const [voiceCallChatId, setVoiceCallChatId] = useState<string | null>(null);
  const [voiceCallCustomerName, setVoiceCallCustomerName] = useState("Customer");
  const [voiceCallUserId, setVoiceCallUserId] = useState("");
  const { toast } = useToast();

  // Voice call hook
  const voiceCall = useVoiceCall({
    chatId: voiceCallChatId,
    myId: partnerId,
    myType: 'delivery_partner',
    partnerId: voiceCallUserId,
    partnerName: voiceCallCustomerName,
  });

  // Listen for incoming calls
  useIncomingCall({
    chatId: voiceCallChatId,
    myId: partnerId,
    myType: 'delivery_partner',
    onIncomingCall: voiceCall.handleIncomingCall,
  });

  // Get or create chat and start voice call
  const handleVoiceCall = useCallback(async (order: Order) => {
    // Start microphone permission request immediately (keeps "user gesture" on mobile)
    const micPromise = voiceCall.requestMicrophone?.();

    try {
      // Fetch customer name
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', order.user_id)
        .single();

      const customerName = user?.name || 'Customer';
      setVoiceCallCustomerName(customerName);
      setVoiceCallUserId(order.user_id);

      // Get or create chat
      const { data: existingChat } = await supabase
        .from('delivery_customer_chats')
        .select('id')
        .eq('order_id', order.id)
        .eq('delivery_partner_id', partnerId)
        .maybeSingle();

      let chatId: string;

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const { data: newChat } = await supabase
          .from('delivery_customer_chats')
          .insert({
            order_id: order.id,
            delivery_partner_id: partnerId,
            user_id: order.user_id,
          })
          .select('id')
          .single();

        if (!newChat) {
          throw new Error('Failed to create chat');
        }
        chatId = newChat.id;
      }

      setVoiceCallChatId(chatId);
      voiceCall.startCall({ 
        chatId, 
        micPromise: micPromise ?? undefined,
        partnerId: order.user_id,
        callerName: partnerName,
      });
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast({
        title: "Error",
        description: "Could not start call. Please try again.",
        variant: "destructive",
      });
    }
  }, [partnerId, toast, voiceCall]);

  const statusOptions = [{
    value: "all",
    label: "All",
    icon: Package
  }, {
    value: "pending",
    label: "Pending",
    icon: Clock
  }, {
    value: "delivered",
    label: "Delivered",
    icon: CheckCircle
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
  // Filter orders by selected date
  const getOrdersForSelectedDate = (ordersToFilter: Order[]) => {
    return ordersToFilter.filter(order => {
      const orderDate = new Date(order.delivered_at || order.assigned_at || order.created_at);
      return isSameDay(orderDate, selectedDate);
    });
  };

  const ordersForSelectedDate = getOrdersForSelectedDate(orders);

  const filteredOrders = ordersForSelectedDate.filter(order => {
    // Status filtering
    if (statusFilter === "pending") {
      return order.status !== "delivered";
    } else if (statusFilter === "delivered") {
      return order.status === "delivered";
    }
    return true;
  });
  // Stats for selected date only
  const allOrdersCount = ordersForSelectedDate.length;
  const pendingOrdersCount = ordersForSelectedDate.filter(o => o.status !== "delivered").length;
  const deliveredOrdersCount = ordersForSelectedDate.filter(o => o.status === "delivered").length;

  // Shared filter UI component
  const renderFilters = () => (
    <div className="space-y-3">
      {/* Date Picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "MMMM do, yyyy") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setDatePickerOpen(false);
              }
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Status Filter Cards (horizontal + compact) */}
      <div className="grid grid-cols-3 gap-2">
        {statusOptions.map(status => {
          const Icon = status.icon;
          const count = status.value === "all" 
            ? allOrdersCount 
            : status.value === "pending" 
              ? pendingOrdersCount 
              : deliveredOrdersCount;
          return (
            <Card 
              key={status.value} 
              className={`cursor-pointer transition-all ${statusFilter === status.value ? 'ring-2 ring-primary shadow-md' : ''}`} 
              onClick={() => setStatusFilter(status.value)}
            >
              <CardContent className="p-2 text-center">
                <p className="text-[10px] font-medium text-muted-foreground leading-tight">{status.label}</p>
                <p className="text-xl font-bold leading-tight">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  if (filteredOrders.length === 0) {
    return (
      <div className="space-y-4">
        {renderFilters()}
        <Card className="text-center border-dashed">
          <CardContent className="py-6">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No orders found</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for new assignments</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderFilters()}

      {filteredOrders.map(order => (
        <Card key={order.id} className="border-l-4 border-l-primary">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#{order.id.slice(0, -4)}</span>
                <span className="font-bold">{order.id.slice(-4)}</span>
                <Badge className={`text-[10px] px-1.5 py-0 ${getStatusBadgeColor(order.status, order.pickup_status)}`}>
                  {order.status === 'delivered' ? 'Delivered' : getPickupStatusText(order.pickup_status || 'assigned')}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-2 px-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{order.seller_name}</p>
              <span className="text-xs text-muted-foreground">{order.items.length} items</span>
            </div>

            <div className="text-xs text-muted-foreground">
              {order.items.slice(0, 2).map((item, index) => (
                <span key={index}>{item.item_name} ×{item.quantity}{index < Math.min(order.items.length, 2) - 1 ? ', ' : ''}</span>
              ))}
              {order.items.length > 2 && <span> +{order.items.length - 2} more</span>}
            </div>

            {/* Show delivery address only after pickup */}
            {(order.pickup_status === 'picked_up' || order.pickup_status === 'going_for_delivery' || order.status === 'delivered') && (
              <div className="flex items-start gap-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">{order.delivery_address}</p>
              </div>
            )}

            {order.instructions && (
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-1">{order.instructions}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>{order.payment_method.toUpperCase()}</span>
              <span>{formatDistanceToNow(new Date(order.assigned_at), { addSuffix: true })}</span>
            </div>

            <div className="flex gap-1.5 pt-2 flex-wrap">
              {/* Pickup Workflow States */}
              {(!order.pickup_status || order.pickup_status === 'assigned') && order.seller_status === 'packed' && (
                <Button size="sm" onClick={() => navigateToSeller(order)} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  Go for Pickup
                </Button>
              )}

              {order.pickup_status === 'going_for_pickup' && (
                <>
                  <Button size="sm" onClick={() => openPinModal(order)} className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2">
                    <Package className="h-3 w-3 mr-1" />
                    Pickup
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigateToSeller(order)} className="border-blue-600 text-blue-600 hover:bg-blue-50 h-7 text-xs px-2">
                    <Navigation className="h-3 w-3 mr-1" />
                    Navigate
                  </Button>
                </>
              )}

              {order.pickup_status === 'picked_up' && order.status === 'out_for_delivery' && (
                <Button size="sm" onClick={() => navigateToCustomer(order)} className="bg-orange-600 hover:bg-orange-700 h-7 text-xs px-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  Go to Delivery
                </Button>
              )}

              {order.pickup_status === 'going_for_delivery' && order.status === 'out_for_delivery' && (
                <>
                  <Button size="sm" onClick={() => openDeliveryPinModal(order)} className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2">
                    Delivered
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigateToCustomer(order)} className="border-green-600 text-green-600 hover:bg-green-50 h-7 text-xs px-2">
                    <Navigation className="h-3 w-3 mr-1" />
                    Navigate
                  </Button>
                </>
              )}

              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
                setChatOrderId(order.id);
                setChatUserId(order.user_id);
                setChatModalOpen(true);
              }}>
                <MessageSquare className="h-3 w-3 mr-1" />
                Chat
              </Button>

              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => handleVoiceCall(order)}>
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* PIN Verification Modal */}
      {selectedOrder && (
        <PinVerificationModal 
          open={pinModalOpen} 
          onOpenChange={setPinModalOpen} 
          expectedPin={expectedPin || (selectedOrder?.pickup_pin ?? '')} 
          onSuccess={handlePickupSuccess} 
          orderNumber={selectedOrder.id} 
        />
      )}
      
      {/* Delivery PIN Verification Modal */}
      {selectedOrder && (
        <DeliveryPinVerificationModal 
          open={deliveryPinModalOpen} 
          onOpenChange={setDeliveryPinModalOpen} 
          expectedPin={expectedDeliveryPin || (selectedOrder?.delivery_pin ?? '')} 
          onSuccess={handleDeliverySuccess} 
          orderNumber={selectedOrder.id} 
        />
      )}

      {/* Chat Modal */}
      <DeliveryCustomerChat
        open={chatModalOpen}
        onOpenChange={setChatModalOpen}
        orderId={chatOrderId}
        deliveryPartnerId={partnerId}
        userId={chatUserId}
        deliveryPartnerName={partnerName}
      />

      {/* Voice Call Modal - No avatar for delivery partner calls */}
      <VoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={voiceCallCustomerName}
        partnerAvatar={null}
        showAvatar={false}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'user'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        onClose={() => {}}
      />
    </div>
  );
};

export default DeliveryPartnerOrders;