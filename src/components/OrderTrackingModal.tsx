import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOrderTracking } from '@/contexts/OrderTrackingContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Clock, Package, Truck, Phone, Star } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { RatingModal } from './RatingModal';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderTrackingModal = ({ isOpen, onClose }: OrderTrackingModalProps) => {
  const { activeOrder } = useOrderTracking();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deliveryPartnerMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !activeOrder || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [activeOrder.delivery_longitude || 83.3150, activeOrder.delivery_latitude || 17.7172],
      zoom: 14,
    });

    // Add markers for restaurant and delivery location
    if (activeOrder.sellers?.seller_latitude && activeOrder.sellers?.seller_longitude) {
      new mapboxgl.Marker({ color: '#FF6B6B' })
        .setLngLat([activeOrder.sellers.seller_longitude, activeOrder.sellers.seller_latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${activeOrder.seller_name}</strong>`))
        .addTo(map.current);
    }

    if (activeOrder.delivery_longitude && activeOrder.delivery_latitude) {
      new mapboxgl.Marker({ color: '#4CAF50' })
        .setLngLat([activeOrder.delivery_longitude, activeOrder.delivery_latitude])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Delivery Location</strong>'))
        .addTo(map.current);
    }

    // If order is picked up or out for delivery, show route and track delivery partner
    if (activeOrder.status === 'picked_up' || activeOrder.status === 'going_for_delivery' || activeOrder.status === 'going_for_pickup') {
      // Initialize delivery partner marker
      const initializeDeliveryPartnerTracking = async () => {
        // Fetch initial delivery partner location
        const { data: partnerData } = await supabase
          .from('delivery_partners')
          .select('latitude, longitude, name')
          .eq('id', activeOrder.assigned_delivery_partner_id)
          .single();

        if (partnerData?.latitude && partnerData?.longitude) {
          // Create delivery partner marker
          deliveryPartnerMarker.current = new mapboxgl.Marker({ 
            color: '#FF8C42',
            scale: 1.2 
          })
            .setLngLat([partnerData.longitude, partnerData.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${partnerData.name}</strong><br>Delivery Partner`))
            .addTo(map.current!);

          // Fetch route from delivery partner to customer
          await fetchRouteFromPartner(partnerData.longitude, partnerData.latitude);
        } else {
          // Fallback to restaurant location if partner location not available
          fetchRoute();
        }
      };

      initializeDeliveryPartnerTracking();
      
      // Set up real-time tracking for delivery partner location
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
          async (payload) => {
            const newData = payload.new as any;
            console.log('Delivery partner location updated:', newData);
            
            if (newData.latitude && newData.longitude && deliveryPartnerMarker.current) {
              // Update marker position
              deliveryPartnerMarker.current.setLngLat([newData.longitude, newData.latitude]);
              
              // Update route from new location to customer
              await fetchRouteFromPartner(newData.longitude, newData.latitude);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        deliveryPartnerMarker.current?.remove();
        map.current?.remove();
      };
    }

    return () => {
      map.current?.remove();
    };
  }, [activeOrder, mapboxToken, isOpen]);

  const fetchRoute = async () => {
    if (!activeOrder || !map.current) return;

    const start = [activeOrder.sellers.seller_longitude, activeOrder.sellers.seller_latitude];
    const end = [activeOrder.delivery_longitude, activeOrder.delivery_latitude];

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route,
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route,
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#FF6B35',
              'line-width': 5,
            },
          });
        }

        // Fit map to show the route
        const coordinates = route.coordinates;
        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
            return bounds.extend(coord as [number, number]);
          },
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const fetchRouteFromPartner = async (partnerLng: number, partnerLat: number) => {
    if (!activeOrder || !map.current) return;

    const start = [partnerLng, partnerLat];
    const end = [activeOrder.delivery_longitude, activeOrder.delivery_latitude];

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route,
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route,
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#FF6B35',
              'line-width': 5,
            },
          });
        }

        // Fit map to show the route
        const coordinates = route.coordinates;
        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
            return bounds.extend(coord as [number, number]);
          },
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error fetching route from partner:', error);
    }
  };

  if (!activeOrder) return null;

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: CheckCircle2, color: 'green' },
      { key: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'green' },
      { key: 'preparing', label: 'Preparing', icon: Package, color: 'orange' },
      { key: 'packed', label: 'Packed', icon: Package, color: 'green' },
      { key: 'going_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'green' },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'green' },
    ];

    const statusOrder = ['pending', 'accepted', 'preparing', 'packed', 'assigned', 'going_for_pickup', 'picked_up', 'going_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(activeOrder.status);

    return steps.map((step) => {
      const stepIndex = statusOrder.indexOf(step.key);
      let completed = stepIndex <= currentIndex;
      let color = 'gray';
      
      if (completed) {
        // Preparing shows orange only when currently in preparing status
        if (step.key === 'preparing' && activeOrder.status === 'preparing') {
          color = 'orange';
        } else {
          color = step.color;
        }
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
    const estimatedTime = new Date(createdAt.getTime() + 30 * 60000); // 30 minutes
    
    if (activeOrder.status === 'picked_up' || activeOrder.status === 'going_for_delivery') {
      const now = new Date();
      const diffInMinutes = Math.ceil((estimatedTime.getTime() - now.getTime()) / 60000);
      return `${diffInMinutes} min`;
    }
    
    return estimatedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const items = Array.isArray(activeOrder.items) ? activeOrder.items : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 z-50">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold">
            {activeOrder.seller_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(activeOrder.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} • {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </DialogHeader>

        {/* Map - Show when picked up or out for delivery */}
        {(activeOrder.status === 'picked_up' || activeOrder.status === 'going_for_delivery' || activeOrder.status === 'going_for_pickup') && (
          <div ref={mapContainer} className="h-64 w-full" />
        )}

        <div className="p-6 space-y-6">
          {/* Delivery Status Card */}
          {activeOrder.status === 'delivered' ? (
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
              {activeOrder.status === 'preparing' ? 'Preparing your order' : 
               activeOrder.status === 'going_for_delivery' ? 'Out for delivery' :
               activeOrder.status === 'delivered' ? 'Delivered' : 'Processing order'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeOrder.status === 'preparing' ? 'Restaurant needs a few more minutes, partner will pick up soon' :
               activeOrder.status === 'going_for_delivery' ? 'Your order is on the way' :
               'Your order is being processed'}
            </p>

            {/* Status Timeline */}
            <div className="space-y-4">
              {getStatusSteps().map((step) => (
                <div key={step.key} className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    step.color === 'green' ? 'text-green-600' : 
                    step.color === 'orange' ? 'text-orange-600' : 
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
                <Button size="icon" variant="outline">
                  <Phone className="h-4 w-4" />
                </Button>
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
    </Dialog>
  );
};

export default OrderTrackingModal;
