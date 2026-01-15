import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { formatDistanceToNow } from "date-fns";
import { Package, Clock, CheckCircle, Truck, AlertCircle, ArrowLeft, Star, MapPin, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { RatingModal } from "@/components/RatingModal";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { useOrderTracking } from "@/contexts/OrderTrackingContext";
interface Order {
  id: string;
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
  seller_status?: string | null;
  delivery_pin: string;
  created_at: string;
  is_rated: boolean;
  refund_id?: string | null;
}
export const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const {
    user,
    isAuthenticated
  } = useUserAuth();
  const { setActiveOrder } = useOrderTracking();
  const navigate = useNavigate();
  const fetchMyOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setOrders((data || []) as any);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyOrders();
    }
  }, [isAuthenticated, user]);
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
      case 'seller_accepted':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'packed':
        return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Placed';
      case 'seller_accepted':
        return 'Accepted by Restaurant';
      case 'preparing':
        return 'Being Prepared';
      case 'packed':
        return 'Ready for Pickup';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'rejected':
        return 'Order Rejected';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please login to view your orders</p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50 pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
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
        {loading ? <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-24 bg-muted rounded"></div>
                </CardContent>
              </Card>)}
          </div> : orders.length === 0 ? <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
              <p className="text-muted-foreground mb-4">
                You haven't placed any orders yet. Start exploring restaurants!
              </p>
              <Button onClick={() => navigate('/')}>Browse Restaurants</Button>
            </CardContent>
          </Card> : <div className="space-y-4">
            {orders.map(order => {
              const wasRejectedBySeller = order.status === 'rejected' || order.seller_status === 'rejected';
              const displayStatus =
                order.status === 'refunded'
                  ? 'refunded'
                  : wasRejectedBySeller
                    ? 'rejected'
                    : order.status;

              return <Card key={order.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
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
                        {formatDistanceToNow(new Date(order.created_at), {
                    addSuffix: true
                  })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">₹{order.total_amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </p>
                      {displayStatus === 'out_for_delivery' && order.delivery_pin && <div className="mt-2">
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Delivery PIN: {order.delivery_pin}
                          </Badge>
                        </div>}
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => <div key={index} className="flex justify-between text-sm">
                        <span>{item.item_name} x{item.quantity}</span>
                        
                      </div>)}
                  </div>

                  {order.instructions && <div className="text-sm text-muted-foreground mb-2">
                      <strong>Instructions:</strong> {order.instructions}
                    </div>}

                  {/* Seller Rejected Message (show even if refunded) */}
                  {wasRejectedBySeller && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-orange-700 font-medium">
                        Order Rejected by Seller - Your amount will be refunded shortly
                      </p>
                    </div>
                  )}

                  {/* Refunded Order Message */}
                  {displayStatus === 'refunded' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-green-700 font-medium">
                        ₹{order.total_amount} Added to Wallet
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Use this balance at checkout
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Payment: {order.payment_method.toUpperCase()}</span>
                    <span className="text-right line-clamp-1">{order.delivery_address.split(',')[0]}</span>
                  </div>

                  {/* Track Order Button - Show for in-progress orders only */}
                  {displayStatus !== 'delivered' &&
                    displayStatus !== 'cancelled' &&
                    displayStatus !== 'rejected' &&
                    displayStatus !== 'refunded' && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Load full order details and set as active order
                          const { data } = await supabase
                            .from('orders')
                            .select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)')
                            .eq('id', order.id)
                            .single();

                          if (data) {
                            setActiveOrder(data);
                            setShowTrackingModal(true);
                          }
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Track Order
                      </Button>
                    </div>
                  )}

                  {/* View Invoice and Rate Order Buttons */}
                  {displayStatus === 'delivered' && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/order/${order.id}`);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                      {!order.is_rated && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setShowRatingModal(true);
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Rate Experience
                        </Button>
                      )}
                    </div>
                  )}

                  {order.is_rated && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Rated</span>
                    </div>
                  )}
                </CardContent>
              </Card>;
            })}
          </div>}
      </div>

      {/* Rating Modal */}
      {selectedOrder && user && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedOrder(null);
          }}
          orderId={selectedOrder.id}
          sellerId={selectedOrder.seller_id}
          sellerName={selectedOrder.seller_name}
          userId={user.id}
          onRatingSubmit={fetchMyOrders}
        />
      )}

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
      />
    </div>;
};