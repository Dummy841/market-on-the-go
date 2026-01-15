import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { formatDistanceToNow } from "date-fns";
import { SupportChatModal } from "@/components/SupportChatModal";

interface Order {
  id: string;
  seller_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export const Help = () => {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const { user, isAuthenticated } = useUserAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRecentOrders();
    }
  }, [isAuthenticated, user]);

  const fetchRecentOrders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, seller_name, total_amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallUs = () => {
    window.location.href = 'tel:6304636782';
  };

  const handleChatWithUs = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowChatModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please login to access help</p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Help</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{order.seller_name}</span>
                        <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>₹{order.total_amount}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => handleChatWithUs(order.id)}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                        onClick={handleCallUs}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* General Help Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">General Help</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    setSelectedOrderId(null);
                    setShowChatModal(true);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat with us
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCallUs}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call us
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Available 24/7 for your assistance
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Support Chat Modal */}
      {user && (
        <SupportChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedOrderId(null);
          }}
          userId={user.id}
          userName={user.name}
          userMobile={user.mobile}
          orderId={selectedOrderId}
        />
      )}
    </div>
  );
};

export default Help;
