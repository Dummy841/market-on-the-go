import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOrderTracking } from '@/contexts/OrderTrackingContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Package, Truck, Phone, Star, MessageCircle } from 'lucide-react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { RatingModal } from './RatingModal';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import UserDeliveryChat from './UserDeliveryChat';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useIncomingCall } from '@/hooks/useIncomingCall';
import VoiceCallModal from './VoiceCallModal';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const containerStyle = {
  width: '100%',
  height: '256px'
};

const OrderTrackingModal = ({ isOpen, onClose }: OrderTrackingModalProps) => {
  const { activeOrder } = useOrderTracking();
  const { isLoaded } = useGoogleMaps();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [deliveryPartnerLocation, setDeliveryPartnerLocation] = useState<{lat: number, lng: number} | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  // Get or create chat for voice call
  const getOrCreateChat = useCallback(async () => {
    if (!activeOrder || !activeOrder.assigned_delivery_partner_id) return null;

    // Check if chat exists
    const { data: existingChat } = await supabase
      .from('delivery_customer_chats')
      .select('id')
      .eq('order_id', activeOrder.id)
      .eq('user_id', activeOrder.user_id)
      .maybeSingle();

    if (existingChat) {
      setChatId(existingChat.id);
      return existingChat.id;
    }

    // Create new chat
    const { data: newChat } = await supabase
      .from('delivery_customer_chats')
      .insert({
        order_id: activeOrder.id,
        delivery_partner_id: activeOrder.assigned_delivery_partner_id,
        user_id: activeOrder.user_id,
      })
      .select('id')
      .single();

    if (newChat) {
      setChatId(newChat.id);
      return newChat.id;
    }

    return null;
  }, [activeOrder]);

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && activeOrder?.assigned_delivery_partner_id) {
      getOrCreateChat();
    }
  }, [isOpen, activeOrder?.assigned_delivery_partner_id, getOrCreateChat]);

  // Voice call hook
  const voiceCall = useVoiceCall({
    chatId,
    myId: activeOrder?.user_id || '',
    myType: 'user',
    partnerId: activeOrder?.assigned_delivery_partner_id || '',
    partnerName: activeOrder?.delivery_partners?.name || 'Delivery Partner',
  });

  // Listen for incoming calls
  useIncomingCall({
    chatId,
    myId: activeOrder?.user_id || '',
    myType: 'user',
    onIncomingCall: voiceCall.handleIncomingCall,
  });

  // Handle voice call button click
  const handleVoiceCall = async () => {
    // Start microphone permission request immediately (keeps "user gesture" on mobile)
    const micPromise = voiceCall.requestMicrophone?.();

    let effectiveChatId = chatId;
    if (!effectiveChatId) {
      effectiveChatId = await getOrCreateChat();
    }

    if (!effectiveChatId) return;

    voiceCall.startCall({ chatId: effectiveChatId, micPromise: micPromise ?? undefined });
  };

  // Fetch delivery partner location and set up real-time tracking
  useEffect(() => {
    if (!activeOrder || !activeOrder.assigned_delivery_partner_id) return;
    
    const isTrackingStatus = ['picked_up', 'going_for_delivery', 'going_for_pickup'].includes(activeOrder.status);
    if (!isTrackingStatus) return;

    // Fetch initial delivery partner location
    const fetchPartnerLocation = async () => {
      const { data: partnerData } = await supabase
        .from('delivery_partners')
        .select('latitude, longitude')
        .eq('id', activeOrder.assigned_delivery_partner_id)
        .single();

      if (partnerData?.latitude && partnerData?.longitude) {
        setDeliveryPartnerLocation({
          lat: partnerData.latitude,
          lng: partnerData.longitude
        });
      }
    };

    fetchPartnerLocation();

    // Set up real-time tracking
    const channel = supabase
      .channel('delivery-partner-location-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_partners',
          filter: `id=eq.${activeOrder.assigned_delivery_partner_id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          console.log('Delivery partner location updated:', newData);
          
          if (newData.latitude && newData.longitude) {
            setDeliveryPartnerLocation({
              lat: newData.latitude,
              lng: newData.longitude
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder]);

  // Calculate directions when partner location changes
  useEffect(() => {
    if (!isLoaded || !deliveryPartnerLocation || !activeOrder?.delivery_latitude || !activeOrder?.delivery_longitude) {
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: deliveryPartnerLocation,
        destination: {
          lat: Number(activeOrder.delivery_latitude),
          lng: Number(activeOrder.delivery_longitude)
        },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [isLoaded, deliveryPartnerLocation, activeOrder?.delivery_latitude, activeOrder?.delivery_longitude]);

  if (!activeOrder) return null;

  const isRejected = (activeOrder as any).seller_status === 'rejected';
  const isRefunded = activeOrder.status === 'refunded';

  const getStatusSteps = () => {
    // Show different steps for rejected orders
    if (isRejected) {
      return [
        { key: 'pending', label: 'Order Placed', icon: CheckCircle2, color: 'green', completed: true },
        { key: 'rejected', label: 'Order Rejected', icon: CheckCircle2, color: 'red', completed: true },
        { 
          key: 'refund', 
          label: isRefunded ? 'Refund Processed' : 'Refund Pending', 
          icon: CheckCircle2, 
          color: isRefunded ? 'green' : 'orange', 
          completed: true 
        },
      ];
    }

    const steps = [
      { key: 'pending', label: 'Order Placed', icon: CheckCircle2, color: 'green' },
      { key: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'green' },
      { key: 'preparing', label: 'Preparing', icon: Package, color: 'orange' },
      { key: 'packed', label: 'Packed', icon: Package, color: 'green' },
      { key: 'going_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'green' },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'green' },
    ];

    const sellerStatus = (activeOrder as any).seller_status || 'pending';
    const pickupStatus = (activeOrder as any).pickup_status;
    const mainStatus = activeOrder.status;
    
    const sellerStatusOrder = ['pending', 'accepted', 'preparing', 'packed'];
    const currentSellerIndex = sellerStatusOrder.indexOf(sellerStatus);

    return steps.map((step) => {
      let completed = false;
      let color = 'gray';
      
      if (step.key === 'pending') {
        completed = true;
        color = step.color;
      } else if (step.key === 'accepted') {
        completed = currentSellerIndex >= sellerStatusOrder.indexOf('accepted');
        color = completed ? step.color : 'gray';
      } else if (step.key === 'preparing') {
        completed = currentSellerIndex >= sellerStatusOrder.indexOf('preparing');
        if (sellerStatus === 'preparing') {
          color = 'orange';
        } else if (completed) {
          color = 'green';
        }
      } else if (step.key === 'packed') {
        completed = currentSellerIndex >= sellerStatusOrder.indexOf('packed');
        color = completed ? step.color : 'gray';
      } else if (step.key === 'going_for_delivery') {
        completed = pickupStatus === 'picked_up' || mainStatus === 'going_for_delivery' || mainStatus === 'delivered';
        color = completed ? step.color : 'gray';
      } else if (step.key === 'delivered') {
        completed = mainStatus === 'delivered';
        color = completed ? step.color : 'gray';
      }
      
      return {
        ...step,
        completed,
        color,
      };
    });
  };

  const getDeliveryTime = () => {
    if (activeOrder.status === 'delivered' && activeOrder.delivered_at) {
      const deliveredAt = new Date(activeOrder.delivered_at);
      const now = new Date();
      const diffInMinutes = Math.ceil((now.getTime() - deliveredAt.getTime()) / 60000);
      return `${diffInMinutes} min ago`;
    }
    
    const createdAt = new Date(activeOrder.created_at);
    const estimatedTime = new Date(createdAt.getTime() + 30 * 60000);
    
    if (activeOrder.status === 'picked_up' || activeOrder.status === 'going_for_delivery') {
      const now = new Date();
      const diffInMinutes = Math.ceil((estimatedTime.getTime() - now.getTime()) / 60000);
      return `${diffInMinutes} min`;
    }
    
    return estimatedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const items = Array.isArray(activeOrder.items) ? activeOrder.items : [];
  
  const showMap = ['picked_up', 'going_for_delivery', 'going_for_pickup'].includes(activeOrder.status);
  
  const mapCenter = deliveryPartnerLocation || {
    lat: Number(activeOrder.delivery_latitude) || 17.7172,
    lng: Number(activeOrder.delivery_longitude) || 83.3150
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 bg-background">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold">
            {activeOrder.seller_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(activeOrder.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} • {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </DialogHeader>

        {/* Google Map - Show when picked up or out for delivery */}
        {showMap && isLoaded && (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={14}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {/* Restaurant Marker */}
            {activeOrder.sellers?.seller_latitude && activeOrder.sellers?.seller_longitude && (
              <Marker
                position={{
                  lat: Number(activeOrder.sellers.seller_latitude),
                  lng: Number(activeOrder.sellers.seller_longitude)
                }}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
                title={activeOrder.seller_name}
              />
            )}

            {/* Customer Location Marker */}
            {activeOrder.delivery_latitude && activeOrder.delivery_longitude && (
              <Marker
                position={{
                  lat: Number(activeOrder.delivery_latitude),
                  lng: Number(activeOrder.delivery_longitude)
                }}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
                title="Delivery Location"
              />
            )}

            {/* Delivery Partner Marker */}
            {deliveryPartnerLocation && (
              <Marker
                position={deliveryPartnerLocation}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                  scaledSize: new google.maps.Size(45, 45)
                }}
                title="Delivery Partner"
              />
            )}

            {/* Route */}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#FF6B35',
                    strokeWeight: 5,
                  }
                }}
              />
            )}
          </GoogleMap>
        )}

        {showMap && !isLoaded && (
          <div className="h-64 w-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Rejected Order Status Card */}
          {isRejected ? (
            <Card className={`p-4 ${isRefunded ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-5 w-5 ${isRefunded ? 'text-green-600' : 'text-orange-600'}`} />
                <div>
                  <p className={`font-semibold ${isRefunded ? 'text-green-900' : 'text-orange-900'}`}>
                    {isRefunded ? 'Refund Processed' : 'Refund Pending'}
                  </p>
                  <p className={`text-sm ${isRefunded ? 'text-green-700' : 'text-orange-700'}`}>
                    {isRefunded 
                      ? 'Your refund has been processed successfully' 
                      : 'Your order was rejected. Refund will be processed within 24-48 hours'}
                  </p>
                </div>
              </div>
            </Card>
          ) : activeOrder.status === 'delivered' ? (
            <Card className="bg-green-50 border-green-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Delivered</p>
                    <p className="text-sm text-green-700">Delivered {getDeliveryTime()}</p>
                  </div>
                </div>
                {!activeOrder.is_rated && (
                  <Button 
                    onClick={() => setShowRatingModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Order
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-green-50 border-green-200 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">
                    {activeOrder.status === 'picked_up' || activeOrder.status === 'going_for_delivery' 
                      ? 'Arriving Soon' 
                      : 'On-Time Guarantee'}
                  </p>
                  <p className="text-sm text-green-700">
                    {activeOrder.status === 'picked_up' || activeOrder.status === 'going_for_delivery'
                      ? `Arriving in ${getDeliveryTime()}`
                      : `Delivery on or before ${getDeliveryTime()}`}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Order Status */}
          <div>
            <h3 className="font-semibold text-lg mb-2">
              {isRejected 
                ? 'Order Rejected' 
                : ((activeOrder as any).seller_status === 'preparing' || activeOrder.status === 'preparing') 
                  ? 'Preparing your order' 
                  : ((activeOrder as any).pickup_status === 'picked_up' || activeOrder.status === 'going_for_delivery') 
                    ? 'Out for delivery' 
                    : activeOrder.status === 'delivered' 
                      ? 'Delivered' 
                      : 'Processing order'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isRejected
                ? isRefunded 
                  ? 'Your refund has been processed to your original payment method' 
                  : 'Restaurant was unable to accept your order. Refund will be processed shortly.'
                : ((activeOrder as any).seller_status === 'preparing' || activeOrder.status === 'preparing') 
                  ? 'Restaurant needs a few more minutes, partner will pick up soon' 
                  : ((activeOrder as any).pickup_status === 'picked_up' || activeOrder.status === 'going_for_delivery') 
                    ? 'Your order is on the way' 
                    : 'Your order is being processed'}
            </p>

            {/* Status Timeline */}
            <div className="space-y-4">
              {getStatusSteps().map((step) => (
                <div key={step.key} className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    step.color === 'green' ? 'text-green-600' : 
                    step.color === 'orange' ? 'text-orange-600' : 
                    step.color === 'red' ? 'text-red-600' :
                    'text-gray-300'
                  }`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                  </div>
                  {step.completed && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        step.color === 'green' ? 'bg-green-100 text-green-700' :
                        step.color === 'red' ? 'bg-red-100 text-red-700' :
                        step.color === 'orange' ? 'bg-orange-100 text-orange-700' : 
                        ''
                      }`}
                    >
                      Done
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Partner Info */}
          {activeOrder.delivery_partners && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={activeOrder.delivery_partners.profile_photo_url} />
                    <AvatarFallback>{activeOrder.delivery_partners.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{activeOrder.delivery_partners.name}</p>
                    <p className="text-sm text-muted-foreground">Delivery Partner</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => setShowChatModal(true)}
                    title="Chat with delivery partner"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={handleVoiceCall}
                    title="Call delivery partner"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Delivery Instructions */}
          {activeOrder.instructions && (
            <div>
              <p className="font-semibold mb-2">Delivery Instructions</p>
              <p className="text-sm text-muted-foreground">{activeOrder.instructions}</p>
            </div>
          )}

          {/* Order Items */}
          <div>
            <p className="font-semibold mb-2">Order Items</p>
            <div className="space-y-2">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.item_name} x {item.quantity}</span>
                  <span>₹{item.seller_price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Rating Modal */}
      {activeOrder && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          orderId={activeOrder.id}
          sellerId={activeOrder.seller_id}
          sellerName={activeOrder.seller_name}
          userId={activeOrder.user_id}
          onRatingSubmit={() => {
            setShowRatingModal(false);
          }}
        />
      )}

      {/* Chat Modal */}
      {activeOrder && (
        <UserDeliveryChat
          open={showChatModal}
          onOpenChange={setShowChatModal}
          orderId={activeOrder.id}
          userId={activeOrder.user_id}
        />
      )}

      {/* Voice Call Modal */}
      <VoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={
          voiceCall.state.callerType === 'delivery_partner' 
            ? 'Zippy Delivery Partner'
            : activeOrder?.delivery_partners?.name || 'Delivery Partner'
        }
        partnerAvatar={activeOrder?.delivery_partners?.profile_photo_url}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'delivery_partner'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        onClose={() => {}}
      />
    </Dialog>
  );
};

export default OrderTrackingModal;
