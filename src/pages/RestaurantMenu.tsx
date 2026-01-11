import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Clock, MapPin, Plus, ChevronRight, Info, Search, X } from "lucide-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useCart } from "@/contexts/CartContext";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import restaurant1 from "@/assets/restaurant-1.jpg";
import { calculateDistance, getDeliveryTime, formatDistance } from "@/lib/distanceUtils";
interface Restaurant {
  id: string;
  seller_name: string;
  profile_photo_url: string | null;
  owner_name: string;
  mobile: string;
  is_online?: boolean;
  average_rating?: number;
  total_ratings?: number;
  seller_latitude?: number;
  seller_longitude?: number;
  distance?: number;
  deliveryTime?: string;
}
interface MenuItem {
  id: string;
  item_name: string;
  seller_price: number;
  franchise_price: number;
  item_photo_url: string | null;
  is_active: boolean;
  item_info?: string | null;
  average_rating?: number;
  total_ratings?: number;
}
const RestaurantMenu = () => {
  const {
    restaurantId
  } = useParams<{
    restaurantId: string;
  }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [similarRestaurants, setSimilarRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showItemInfoModal, setShowItemInfoModal] = useState(false);
  const [selectedItemInfo, setSelectedItemInfo] = useState<{ name: string; info: string } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    addToCart,
    getTotalItems,
    getTotalPrice
  } = useCart();

  // Filter menu items based on search query - name matches first, then description matches
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Separate into name matches and description-only matches
    const nameMatches: MenuItem[] = [];
    const descriptionOnlyMatches: MenuItem[] = [];
    
    menuItems.forEach(item => {
      const nameMatch = item.item_name.toLowerCase().includes(query);
      const descMatch = item.item_info?.toLowerCase().includes(query);
      
      if (nameMatch) {
        nameMatches.push(item);
      } else if (descMatch) {
        descriptionOnlyMatches.push(item);
      }
    });
    
    // Return name matches first, then description matches
    return [...nameMatches, ...descriptionOnlyMatches];
  }, [menuItems, searchQuery]);
  useEffect(() => {
    getUserLocation();
    
    // Listen for address changes from the Header
    const handleAddressChanged = (event: CustomEvent) => {
      const { latitude, longitude } = event.detail;
      console.log('Address changed event received:', { latitude, longitude });
      if (latitude && longitude) {
        const newLocation = {
          lat: parseFloat(latitude.toString()),
          lng: parseFloat(longitude.toString())
        };
        console.log('Setting new user location:', newLocation);
        setUserLocation(newLocation);
        setLoading(true); // Force loading state to show update
      }
    };
    
    window.addEventListener('addressChanged', handleAddressChanged as EventListener);
    return () => {
      window.removeEventListener('addressChanged', handleAddressChanged as EventListener);
    };
  }, []);
  
  useEffect(() => {
    if (restaurantId && userLocation) {
      console.log('Fetching restaurant data with location:', userLocation);
      fetchRestaurantData();
    }
  }, [restaurantId, userLocation]);
  const getUserLocation = async () => {
    try {
      // First, check if there's a selected address in localStorage
      const storedAddress = localStorage.getItem('selectedAddress');
      if (storedAddress) {
        try {
          const parsed = JSON.parse(storedAddress);
          if (parsed.latitude && parsed.longitude) {
            setUserLocation({
              lat: parseFloat(parsed.latitude.toString()),
              lng: parseFloat(parsed.longitude.toString())
            });
            return;
          }
        } catch (error) {
          console.error('Error parsing stored address:', error);
        }
      }
      
      // Fallback: try to get user's saved default address from DB
      const {
        data: addresses
      } = await supabase.from('user_addresses').select('latitude, longitude').eq('is_default', true).limit(1);
      if (addresses && addresses.length > 0) {
        setUserLocation({
          lat: parseFloat(addresses[0].latitude.toString()),
          lng: parseFloat(addresses[0].longitude.toString())
        });
        return;
      }

      // If no saved address, use browser geolocation with timeout
      if (navigator.geolocation) {
        const timeoutId = setTimeout(() => {
          // Fallback if geolocation takes too long
          setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Hyderabad default
        }, 5000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => {
            clearTimeout(timeoutId);
            // Default to a location if geolocation fails
            setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Hyderabad
          },
          { timeout: 5000 }
        );
      } else {
        setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Default
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      setUserLocation({
        lat: 17.385044,
        lng: 78.486671
      }); // Default
    }
  };
  const fetchRestaurantData = async () => {
    if (!userLocation) return;
    try {
      // Fetch restaurant details
      const {
        data: restaurantData,
        error: restaurantError
      } = await supabase.from('sellers').select('id, seller_name, profile_photo_url, owner_name, mobile, is_online, seller_latitude, seller_longitude').eq('id', restaurantId).eq('status', 'approved').single();
      if (restaurantError) throw restaurantError;

      // Fetch rating for this restaurant
      const {
        data: ratingData
      } = await supabase.rpc('get_seller_rating', {
        seller_uuid: restaurantId
      });

      // Calculate distance if restaurant has coordinates
      let distance = 0;
      let deliveryTime = "25-35 min";
      if (restaurantData.seller_latitude && restaurantData.seller_longitude) {
        distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(restaurantData.seller_latitude.toString()), parseFloat(restaurantData.seller_longitude.toString()));
        deliveryTime = getDeliveryTime(distance);
      }
      setRestaurant({
        ...restaurantData,
        average_rating: ratingData?.[0]?.average_rating || 0,
        total_ratings: ratingData?.[0]?.total_ratings || 0,
        distance,
        deliveryTime
      });

      // Fetch menu items (include all items, both active and inactive)
      const {
        data: itemsData,
        error: itemsError
      } = await supabase.from('items').select('*').eq('seller_id', restaurantId);
      if (itemsError) throw itemsError;
      
      // Fetch item ratings from orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('items, id')
        .eq('seller_id', restaurantId)
        .eq('is_rated', true);
      
      // Get ratings for items
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('order_id, rating')
        .eq('seller_id', restaurantId);
      
      // Build a map of order_id -> rating
      const orderRatingMap = new Map<string, number>();
      ratingsData?.forEach(r => {
        orderRatingMap.set(r.order_id, r.rating);
      });
      
      // Calculate average rating per item
      const itemRatingsMap = new Map<string, { total: number; count: number }>();
      ordersData?.forEach(order => {
        const orderRating = orderRatingMap.get(order.id);
        if (orderRating && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const itemId = item.id;
            if (itemId) {
              const existing = itemRatingsMap.get(itemId) || { total: 0, count: 0 };
              itemRatingsMap.set(itemId, {
                total: existing.total + orderRating,
                count: existing.count + 1
              });
            }
          });
        }
      });
      
      // Merge ratings into items
      const itemsWithRatings = (itemsData || []).map(item => {
        const ratingInfo = itemRatingsMap.get(item.id);
        return {
          ...item,
          average_rating: ratingInfo ? Math.round((ratingInfo.total / ratingInfo.count) * 10) / 10 : 0,
          total_ratings: ratingInfo?.count || 0
        };
      });
      
      setMenuItems(itemsWithRatings);

      // Fetch similar restaurants (other approved sellers)
      const {
        data: similarData,
        error: similarError
      } = await supabase.from('sellers').select('id, seller_name, profile_photo_url, owner_name, mobile, is_online, seller_latitude, seller_longitude').eq('status', 'approved').neq('id', restaurantId);
      if (similarError) throw similarError;

      // Fetch ratings and calculate distances for similar restaurants
      const similarWithDetails = await Promise.all((similarData || []).map(async restaurant => {
        const {
          data: ratingData
        } = await supabase.rpc('get_seller_rating', {
          seller_uuid: restaurant.id
        });

        // Calculate distance
        let distance = 0;
        if (restaurant.seller_latitude && restaurant.seller_longitude) {
          distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(restaurant.seller_latitude.toString()), parseFloat(restaurant.seller_longitude.toString()));
        }
        return {
          ...restaurant,
          average_rating: ratingData?.[0]?.average_rating || 0,
          total_ratings: ratingData?.[0]?.total_ratings || 0,
          distance,
          deliveryTime: getDeliveryTime(distance)
        };
      }));

      // Filter restaurants within 10km, sort by distance, and limit to 3
      const nearbySimilar = similarWithDetails.filter(r => r.distance <= 10).sort((a, b) => a.distance - b.distance).slice(0, 3);
      setSimilarRestaurants(nearbySimilar);
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleAddToCart = (item: MenuItem) => {
    if (!restaurant) return;
    addToCart({
      id: item.id,
      item_name: item.item_name,
      seller_price: item.seller_price,
      item_photo_url: item.item_photo_url,
      seller_id: restaurantId!,
      seller_name: restaurant.seller_name,
      seller_latitude: restaurant.seller_latitude,
      seller_longitude: restaurant.seller_longitude
    });
  };
  return (
    <div className="min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Header />
      </div>

      <main className="container mx-auto px-4 py-6 max-w-full overflow-x-hidden" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top) + 1.5rem)' }}>
        {loading ? (
          <div className="animate-pulse">Loading restaurant...</div>
        ) : !restaurant ? (
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
            <Button onClick={() => navigate('/')}>
              Go back to home
            </Button>
          </div>
        ) : (
          <>
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/restaurants')}
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to restaurants
            </Button>

            {/* Search Bar - Top */}
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Restaurant Header - Compact */}
            <div className="bg-card rounded-lg p-3 mb-6 shadow-card">
              {restaurant.is_online === false && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">Offline</Badge>
                    <span className="text-xs text-muted-foreground">
                      Not taking orders now
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <img
                  src={restaurant.profile_photo_url || restaurant1}
                  alt={restaurant.seller_name}
                  className={`w-16 h-16 rounded-lg object-cover flex-shrink-0 ${
                    restaurant.is_online === false ? 'grayscale' : ''
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="font-semibold text-card-foreground text-sm line-clamp-1">
                      {restaurant.seller_name}
                    </h1>
                    <Badge
                      variant={restaurant.is_online !== false ? 'default' : 'secondary'}
                      className="flex-shrink-0 text-[10px] px-1.5 py-0"
                    >
                      {restaurant.is_online !== false ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Owner: {restaurant.owner_name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-food-green fill-current flex-shrink-0" />
                      <span>
                        {restaurant.average_rating > 0 ? restaurant.average_rating : 'New'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {restaurant.is_online !== false
                          ? restaurant.deliveryTime || '25-35 min'
                          : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {formatDistance(restaurant.distance || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-foreground mb-4">Menu Items</h2>
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? `No items found for "${searchQuery}"` : 'No menu items available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pb-24">
                  {filteredMenuItems.map((item) => (
                    <Card
                      key={item.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow border-border/40"
                    >
                      <div className="relative h-40 overflow-hidden">
                        {item.item_photo_url ? (
                          <img
                            src={item.item_photo_url}
                            alt={item.item_name}
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-subtle flex items-center justify-center">
                            <span className="text-muted-foreground">No image</span>
                          </div>
                        )}
                        {/* Rating Badge Overlay */}
                        {item.average_rating > 0 && (
                          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold">{item.average_rating}</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2">
                            {item.item_name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="bg-yellow-400/20 text-yellow-700 hover:bg-yellow-400/30 text-xs px-2 py-0"
                            >
                              ₹{item.seller_price}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.item_info && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedItemInfo({ name: item.item_name, info: item.item_info! });
                                  setShowItemInfoModal(true);
                                }}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(item)}
                              disabled={!item.is_active || restaurant.is_online === false}
                              className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {restaurant.is_online === false ? 'Offline' : 'ADD'}
                            </Button>
                          </div>
                        </div>

                        {!item.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Unavailable
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Similar Restaurants */}
            {similarRestaurants.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Similar Restaurants
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {similarRestaurants.map((similarRestaurant) => (
                    <RestaurantCard
                      key={similarRestaurant.id}
                      id={similarRestaurant.id}
                      name={similarRestaurant.seller_name}
                      image={similarRestaurant.profile_photo_url || restaurant1}
                      cuisine={['Restaurant']}
                      rating={similarRestaurant.average_rating || 0}
                      reviewsCount={similarRestaurant.total_ratings || 0}
                      deliveryTime={
                        similarRestaurant.is_online !== false
                          ? similarRestaurant.deliveryTime || '25-35 min'
                          : 'Currently not taking orders'
                      }
                      deliveryFee={0}
                      distance={formatDistance(similarRestaurant.distance || 0)}
                      offers={
                        similarRestaurant.is_online !== false
                          ? ['Fresh & Delicious']
                          : ['Offline']
                      }
                      onClick={() => navigate(`/restaurant/${similarRestaurant.id}`)}
                      isOffline={similarRestaurant.is_online === false}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Order Tracking Button */}
      <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
      <OrderTrackingModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
      />

      {/* Floating Cart Button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <Button
            onClick={() => navigate('/cart')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 shadow-lg flex items-center justify-between pointer-events-auto rounded-full"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-1 rounded text-sm">
                {getTotalItems()}
              </span>
              <span>Item{getTotalItems() > 1 ? 's' : ''} added</span>
            </div>
            <div className="flex items-center gap-2">
              <span>View Cart</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Button>
        </div>
      )}

      {/* Item Info Modal */}
      <Dialog open={showItemInfoModal} onOpenChange={setShowItemInfoModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedItemInfo?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedItemInfo?.info}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default RestaurantMenu;