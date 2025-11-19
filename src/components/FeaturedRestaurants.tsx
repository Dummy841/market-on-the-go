import { RestaurantCard } from "./RestaurantCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import restaurant1 from "@/assets/restaurant-1.jpg";
import { calculateDistance, getDeliveryTime, formatDistance } from "@/lib/distanceUtils";

interface Restaurant {
  id: string;
  seller_name: string;
  profile_photo_url: string | null;
  status: string;
  is_online?: boolean;
  average_rating?: number;
  total_ratings?: number;
  seller_latitude?: number;
  seller_longitude?: number;
  distance?: number;
  deliveryTime?: string;
}
export const FeaturedRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchRestaurants();
    }
  }, [userLocation]);

  const getUserLocation = async () => {
    try {
      // First, try to get user's saved default address
      const { data: addresses } = await supabase
        .from('user_addresses')
        .select('latitude, longitude')
        .eq('is_default', true)
        .limit(1);

      if (addresses && addresses.length > 0) {
        setUserLocation({
          lat: parseFloat(addresses[0].latitude.toString()),
          lng: parseFloat(addresses[0].longitude.toString())
        });
        return;
      }

      // If no saved address, use browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => {
            // Default to a location if geolocation fails
            setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Hyderabad
          }
        );
      } else {
        setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Default
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Default
    }
  };

  const fetchRestaurants = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
        .select('id, seller_name, profile_photo_url, status, is_online, seller_latitude, seller_longitude')
        .eq('status', 'approved');

      if (error) throw error;
      
      // Fetch ratings and calculate distances for each restaurant
      const restaurantsWithDetails = await Promise.all(
        (data || []).map(async (restaurant) => {
          const { data: ratingData } = await supabase
            .rpc('get_seller_rating', { seller_uuid: restaurant.id });
          
          // Calculate distance if restaurant has coordinates
          let distance = 0;
          if (restaurant.seller_latitude && restaurant.seller_longitude) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              parseFloat(restaurant.seller_latitude.toString()),
              parseFloat(restaurant.seller_longitude.toString())
            );
          }

          return {
            ...restaurant,
            average_rating: ratingData?.[0]?.average_rating || 0,
            total_ratings: ratingData?.[0]?.total_ratings || 0,
            distance,
            deliveryTime: getDeliveryTime(distance)
          };
        })
      );

      // Filter restaurants within 10km and sort by distance
      const nearbyRestaurants = restaurantsWithDetails
        .filter(r => r.distance <= 10)
        .sort((a, b) => a.distance - b.distance);
      
      setRestaurants(nearbyRestaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}`);
  };
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Loading restaurants...</div>
      </div>
    );
  }
  if (!userLocation) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Getting your location...</div>
      </div>
    );
  }

  if (restaurants.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No restaurants found within 10km of your location</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
      {restaurants.map(restaurant => (
        <RestaurantCard 
          key={restaurant.id} 
          id={restaurant.id} 
          name={restaurant.seller_name} 
          image={restaurant.profile_photo_url || restaurant1} 
          cuisine={["Restaurant"]} 
          rating={restaurant.average_rating || 0} 
          reviewsCount={restaurant.total_ratings || 0} 
          deliveryTime={restaurant.is_online !== false ? restaurant.deliveryTime || "25-35 min" : "Currently not taking orders"} 
          deliveryFee={0} 
          distance={formatDistance(restaurant.distance || 0)} 
          offers={restaurant.is_online !== false ? ["Fresh & Delicious"] : ["Offline"]} 
          onClick={() => handleRestaurantClick(restaurant.id)} 
          isOffline={restaurant.is_online === false} 
        />
      ))}
    </div>
  );
};