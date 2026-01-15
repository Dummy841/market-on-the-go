import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, CheckCircle, HelpCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { SupportChatModal } from "@/components/SupportChatModal";

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  seller_price: number;
}

interface OrderDetails {
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
  created_at: string;
  delivered_at: string | null;
  delivery_partners?: {
    name: string;
  } | null;
  sellers?: {
    profile_photo_url: string | null;
  } | null;
}

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSupportChat, setShowSupportChat] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          delivery_partners(name),
          sellers(profile_photo_url)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data as any);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      seller_accepted: { label: "Accepted", className: "bg-blue-100 text-blue-800" },
      preparing: { label: "Preparing", className: "bg-purple-100 text-purple-800" },
      packed: { label: "Packed", className: "bg-indigo-100 text-indigo-800" },
      out_for_delivery: { label: "Out for Delivery", className: "bg-orange-100 text-orange-800" },
      delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
      refunded: { label: "Refunded", className: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Calculate item subtotal
  const getItemSubtotal = () => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.seller_price * item.quantity, 0);
  };

  // Check if small cart fee applies
  const getSmallCartFee = () => {
    const subtotal = getItemSubtotal();
    return subtotal < 100 ? 10 : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Order not found</p>
        <Button onClick={() => navigate("/my-orders")}>Back to Orders</Button>
      </div>
    );
  }

  const itemSubtotal = getItemSubtotal();
  const smallCartFee = getSmallCartFee();

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/my-orders")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">ORDER #{order.id.slice(-6).toUpperCase()}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            <Button
              variant="ghost"
              size="sm"
              className="text-primary font-semibold"
              onClick={() => setShowSupportChat(true)}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              HELP
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-sm text-muted-foreground">
            {order.status === "delivered" ? "Delivered" : order.status.replace("_", " ")}, {order.items.reduce((sum, item) => sum + item.quantity, 0)} Items, ₹{order.total_amount}
          </p>
        </div>
      </div>

      {/* Seller Info */}
      <div className="bg-background p-4 border-b">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">{order.seller_name}</p>
            <p className="text-sm text-muted-foreground">Restaurant</p>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-background p-4 border-b">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Delivery Address</p>
            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
          </div>
        </div>
      </div>

      {/* Delivery Confirmation */}
      {order.status === "delivered" && order.delivered_at && (
        <div className="bg-green-50 p-4 border-b flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">
            Order delivered on {format(new Date(order.delivered_at), "dd MMM yyyy")} at {format(new Date(order.delivered_at), "hh:mm a")}
            {order.delivery_partners?.name && ` by ${order.delivery_partners.name}`}
          </p>
        </div>
      )}

      {/* Bill Details */}
      <div className="mt-2 bg-background">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-muted-foreground text-xs tracking-wider">BILL DETAILS</h2>
        </div>

        {/* Items */}
        <div className="p-4 space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <div>
                <span className="font-medium">{item.quantity} x {item.item_name}</span>
                <span className="text-muted-foreground ml-1">@ ₹{item.seller_price} each</span>
              </div>
              <span className="font-medium">₹{item.seller_price * item.quantity}</span>
            </div>
          ))}

          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item Total</span>
              <span>₹{itemSubtotal}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>₹{order.platform_fee}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              {order.delivery_fee === 0 ? (
                <div className="flex items-center gap-2">
                  <span className="line-through text-muted-foreground">₹29</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">FREE</Badge>
                </div>
              ) : (
                <span>₹{order.delivery_fee}</span>
              )}
            </div>

            {smallCartFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Small Order Fee</span>
                <span>₹{smallCartFee}</span>
              </div>
            )}

            {order.gst_charges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes (GST)</span>
                <span>₹{order.gst_charges}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between font-semibold">
              <div className="flex items-center gap-2">
                <span>Bill Total</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {order.payment_method.toUpperCase()}
                </Badge>
              </div>
              <span>₹{order.total_amount}</span>
            </div>
          </div>

          {order.instructions && (
            <div className="border-t pt-3 mt-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Instructions:</span> {order.instructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          className="w-full h-12"
          variant="outline"
          onClick={() => {
            toast({
              title: "Coming Soon",
              description: "Reorder functionality will be available soon!",
            });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          REORDER
        </Button>
      </div>

      {/* Support Chat Modal */}
      {user && (
        <SupportChatModal
          isOpen={showSupportChat}
          onClose={() => setShowSupportChat(false)}
          userId={user.id}
          userName={user.name}
          userMobile={user.mobile}
          orderId={order.id}
        />
      )}
    </div>
  );
};

export default OrderDetails;