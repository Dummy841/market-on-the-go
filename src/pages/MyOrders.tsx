import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { formatDistanceToNow } from "date-fns";
import { Package, Clock, CheckCircle, Truck, AlertCircle, ArrowLeft, Star, MapPin, FileText, MessageCircle, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { RatingModal } from "@/components/RatingModal";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { useOrderTracking } from "@/contexts/OrderTrackingContext";
import { SupportChatModal } from "@/components/SupportChatModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  seller_price: number;
  item_photo_url?: string | null;
}

interface Order {
  id: string;
  seller_id: string;
  seller_name: string;
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  platform_fee: number;
  gst_charges: number;
  delivery_address: string;
  instructions: string;
  payment_method: string;
  status: string;
  seller_status?: string | null;
  delivery_pin: string;
  created_at: string;
  is_rated: boolean;
  refund_id?: string | null;
  assigned_delivery_partner_id?: string | null;
  delivery_partner?: {
    name: string;
    mobile: string;
  } | null;
}

export const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportOrderId, setSupportOrderId] = useState<string | null>(null);
  const [initialSupportMessage, setInitialSupportMessage] = useState<string | null>(null);
  const [viewItemsOrder, setViewItemsOrder] = useState<Order | null>(null);
  const { user, isAuthenticated } = useUserAuth();
  const { setActiveOrder } = useOrderTracking();
  const navigate = useNavigate();

  const fetchMyOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.
      from('orders').
      select('*, delivery_partners(name, mobile)').
      eq('user_id', user.id).
      neq('delivery_address', 'POS - In Store').
      order('created_at', { ascending: false });
      if (error) throw error;
      const ordersWithPartner = (data || []).map((order: any) => ({
        ...order,
        delivery_partner: order.delivery_partners || null
      }));
      setOrders(ordersWithPartner as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({ title: "Error", description: "Failed to fetch your orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleHelpClick = (order: Order) => {
    const itemsList = order.items.map((item) => `${item.item_name} x${item.quantity}`).join(', ');
    const deliveryInfo = order.delivery_partner ?
    `Delivered by: ${order.delivery_partner.name} (${order.delivery_partner.mobile})` :
    'Delivery partner: Not assigned';
    const orderDetails = `📦 Order Help Request\n\nOrder ID: #${order.id}\nRestaurant: ${order.seller_name}\nStatus: ${order.status.toUpperCase()}\n\n📋 Items: ${itemsList}\n\n💰 Total: ₹${order.total_amount}\nPayment: ${order.payment_method.toUpperCase()}\n\n🚚 ${deliveryInfo}\n\n📍 Delivery Address: ${order.delivery_address.replace(/Location:\s*[\d.-]+,\s*[\d.-]+/g, '').trim()}\n\n---\nPlease describe your issue:`;
    setSupportOrderId(order.id);
    setInitialSupportMessage(orderDetails);
    setShowSupportChat(true);
  };

  useEffect(() => {
    if (isAuthenticated) fetchMyOrders();
  }, [isAuthenticated, user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':return <Clock className="h-4 w-4" />;
      case 'seller_accepted':case 'preparing':return <Package className="h-4 w-4" />;
      case 'packed':case 'out_for_delivery':return <Truck className="h-4 w-4" />;
      case 'delivered':return <CheckCircle className="h-4 w-4" />;
      case 'rejected':return <AlertCircle className="h-4 w-4" />;
      default:return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':return 'bg-yellow-100 text-yellow-800';
      case 'seller_accepted':return 'bg-blue-100 text-blue-800';
      case 'preparing':return 'bg-purple-100 text-purple-800';
      case 'packed':return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery':return 'bg-orange-100 text-orange-800';
      case 'delivered':return 'bg-green-100 text-green-800';
      case 'rejected':return 'bg-red-100 text-red-800';
      case 'refunded':return 'bg-green-100 text-green-800';
      default:return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':return 'Order Placed';
      case 'seller_accepted':return 'Accepted by Restaurant';
      case 'preparing':return 'Being Prepared';
      case 'packed':return 'Ready for Pickup';
      case 'out_for_delivery':return 'Out for Delivery';
      case 'delivered':return 'Delivered';
      case 'rejected':return 'Order Rejected';
      case 'refunded':return 'Refunded';
      default:return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please login to view your orders</p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background border-b sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">My Orders</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {loading ?
        <div className="space-y-4">
            {[1, 2, 3].map((i) =>
          <Card key={i} className="animate-pulse">
                <CardContent className="p-4"><div className="h-24 bg-muted rounded"></div></CardContent>
              </Card>
          )}
          </div> :
        orders.length === 0 ?
        <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
              <p className="text-muted-foreground mb-4">You haven't placed any orders yet. Start exploring restaurants!</p>
              <Button onClick={() => navigate('/')}>Browse Restaurants</Button>
            </CardContent>
          </Card> :

        <div className="space-y-4">
            {orders.map((order) => {
            const wasRejectedBySeller = order.status === 'rejected' || order.seller_status === 'rejected';
            const displayStatus = order.status === 'refunded' ? 'refunded' : wasRejectedBySeller ? 'rejected' : order.status;

            // Get first item image for thumbnail
            const firstItemWithImage = order.items.find((item) => item.item_photo_url);

            return (
              <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3">
                        {/* Item thumbnail */}
                        {firstItemWithImage?.item_photo_url &&
                      <img
                        src={firstItemWithImage.item_photo_url}
                        alt={firstItemWithImage.item_name}
                        className="w-14 h-14 rounded-lg object-cover shrink-0" />

                      }
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{order.seller_name}</h3>
                            <Badge className={getStatusColor(displayStatus)}>
                              {getStatusIcon(displayStatus)}
                              <span className="ml-1">{getStatusText(displayStatus)}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.id.slice(0, -4)}<span className="font-bold text-base">{order.id.slice(-4)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">₹{order.total_amount}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                        </p>
                        {displayStatus === 'out_for_delivery' && order.delivery_pin &&
                      <div className="mt-2">
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Delivery PIN: {order.delivery_pin}
                            </Badge>
                          </div>
                      }
                      </div>
                    </div>

                    {/* Items summary + View Items button */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between items-center">
                        


                      
                        <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary"
                        onClick={() => setViewItemsOrder(order)}>
                        
                          <Eye className="h-3 w-3 mr-1" />
                          View Items
                        </Button>
                      </div>
                    </div>

                    {order.instructions &&
                  <div className="text-sm text-muted-foreground mb-2">
                        <strong>Instructions:</strong> {order.instructions}
                      </div>
                  }

                    {wasRejectedBySeller &&
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-orange-700 font-medium">
                          Order Rejected by Seller - Your amount will be refunded shortly
                        </p>
                      </div>
                  }

                    {displayStatus === 'refunded' &&
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-green-700 font-medium">₹{order.total_amount} Added to Wallet</p>
                        <p className="text-xs text-green-600 mt-1">Use this balance at checkout</p>
                      </div>
                  }

                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Payment: {order.payment_method.toUpperCase()}</span>
                      <span className="text-right line-clamp-1">{order.delivery_address.split(',')[0]}</span>
                    </div>

                    {displayStatus !== 'delivered' && displayStatus !== 'cancelled' && displayStatus !== 'rejected' && displayStatus !== 'refunded' &&
                  <div className="mt-3 pt-3 border-t">
                        <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const { data } = await supabase.
                        from('orders').
                        select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)').
                        eq('id', order.id).
                        single();
                        if (data) {
                          setActiveOrder(data);
                          setShowTrackingModal(true);
                        }
                      }}>
                      
                          <MapPin className="h-4 w-4 mr-2" />
                          Track Order
                        </Button>
                      </div>
                  }

                    {displayStatus === 'delivered' &&
                  <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => {e.stopPropagation();navigate(`/order/${order.id}`);}}>
                            <FileText className="h-4 w-4 mr-2" />View Invoice
                          </Button>
                          {!order.is_rated &&
                      <Button variant="outline" size="sm" className="flex-1" onClick={(e) => {e.stopPropagation();setSelectedOrder(order);setShowRatingModal(true);}}>
                              <Star className="h-4 w-4 mr-2" />Rate
                            </Button>
                      }
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={(e) => {e.stopPropagation();handleHelpClick(order);}}>
                          <MessageCircle className="h-4 w-4 mr-2" />Help with this order
                        </Button>
                      </div>
                  }

                    {order.is_rated && displayStatus === 'delivered' &&
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Rated</span>
                      </div>
                  }
                  </CardContent>
                </Card>);

          })}
          </div>
        }
      </div>

      {/* View Items Modal */}
      <Dialog open={!!viewItemsOrder} onOpenChange={(open) => !open && setViewItemsOrder(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Order Items - {viewItemsOrder?.seller_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {viewItemsOrder?.items.map((item, index) =>
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                {item.item_photo_url ?
              <img src={item.item_photo_url} alt={item.item_name} className="w-14 h-14 rounded-lg object-cover shrink-0" /> :

              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
              }
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-sm shrink-0">₹{item.seller_price * item.quantity}</p>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>₹{viewItemsOrder?.total_amount}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedOrder && user &&
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => {setShowRatingModal(false);setSelectedOrder(null);}}
        orderId={selectedOrder.id}
        sellerId={selectedOrder.seller_id}
        sellerName={selectedOrder.seller_name}
        userId={user.id}
        onRatingSubmit={fetchMyOrders} />

      }

      <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />

      {user &&
      <SupportChatModal
        isOpen={showSupportChat}
        onClose={() => {setShowSupportChat(false);setSupportOrderId(null);setInitialSupportMessage(null);}}
        userId={user.id}
        userName={user.name}
        userMobile={user.mobile}
        orderId={supportOrderId}
        initialMessage={initialSupportMessage} />

      }
    </div>);

};