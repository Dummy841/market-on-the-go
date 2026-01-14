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
  category?: string;
  subcategory?: string;
}

interface FeaturedRestaurantsProps {
  category?: string;
  searchQuery?: string;
}

export const FeaturedRestaurants = ({ category = 'food_delivery', searchQuery = '' }: FeaturedRestaurantsProps) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getUserLocation();
    
    // Listen for address changes from the Header
    const handleAddressChanged = (event: CustomEvent) => {
      const { latitude, longitude } = event.detail;
      if (latitude && longitude) {
        setUserLocation({
          lat: parseFloat(latitude.toString()),
          lng: parseFloat(longitude.toString())
        });
      }
    };
    
    window.addEventListener('addressChanged', handleAddressChanged as EventListener);
    return () => {
      window.removeEventListener('addressChanged', handleAddressChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchRestaurants();
    }
  }, [userLocation, category]);

  const getUserLocation = async () => {
    try {
      // First, check if there's a selected address in localStorage
      const storedAddress = localStorage.getItem('selectedAddress');
      if (storedAddress) {
        try {
          const parsed = JSON.parse(storedAddress);
          if (parsed?.latitude != null && parsed?.longitude != null) {
            setUserLocation({
              lat: parseFloat(parsed.latitude.toString()),
              lng: parseFloat(parsed.longitude.toString()),
            });
            return;
          }
        } catch (error) {
          console.error('Error parsing stored address:', error);
        }
      }

      // Next, fall back to the latest device/current coordinates saved by Header
      const currentLat = localStorage.getItem('currentLat');
      const currentLng = localStorage.getItem('currentLng');
      if (currentLat && currentLng) {
        setUserLocation({
          lat: parseFloat(currentLat),
          lng: parseFloat(currentLng),
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
      setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Default
    }
  };

  const fetchRestaurants = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      let query = supabase
        .from('sellers')
        .select('id, seller_name, profile_photo_url, status, is_online, seller_latitude, seller_longitude, category, subcategory')
        .eq('status', 'approved');
      
      // Filter by category
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

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

      // Filter restaurants within 10km
      // Demo Restaurant is always shown regardless of distance
      const nearbyRestaurants = restaurantsWithDetails
        .filter(r => r.distance <= 10 || r.seller_name === 'Demo Restaurant');
      
      // Get current time in IST for time-based sorting
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(now.getTime() + istOffset);
      const currentHour = istTime.getUTCHours();
      const currentMinutes = istTime.getUTCMinutes();
      const timeInMinutes = currentHour * 60 + currentMinutes;
      
      // 6:00 AM = 360 minutes, 11:30 AM = 690 minutes, 11:59 AM = 719 minutes
      const isMorningTime = timeInMinutes >= 360 && timeInMinutes < 690; // 6:00 AM to 11:30 AM
      const isLunchDinnerTime = timeInMinutes >= 719 || timeInMinutes < 360; // 11:59 AM to 11:59 PM (and overnight to 6 AM)
      
      // Sort: online restaurants first (by distance), then offline restaurants (by distance)
      // Also prioritize by subcategory based on time of day (only for food_delivery category)
      const sortedRestaurants = nearbyRestaurants.sort((a, b) => {
        // First, sort by online status (online first)
        if (a.is_online !== false && b.is_online === false) return -1;
        if (a.is_online === false && b.is_online !== false) return 1;
        
        // Time-based subcategory prioritization (only for food_delivery category)
        if (category === 'food_delivery') {
          const aSubcategory = a.subcategory?.toLowerCase() || '';
          const bSubcategory = b.subcategory?.toLowerCase() || '';
          
          if (isMorningTime) {
            // Morning: prioritize tiffins
            const aIsTiffin = aSubcategory.includes('tiffin') || aSubcategory.includes('breakfast');
            const bIsTiffin = bSubcategory.includes('tiffin') || bSubcategory.includes('breakfast');
            if (aIsTiffin && !bIsTiffin) return -1;
            if (!aIsTiffin && bIsTiffin) return 1;
          } else if (isLunchDinnerTime) {
            // Lunch/Dinner time: prioritize lunch and dinner
            const aIsLunchDinner = aSubcategory.includes('lunch') || aSubcategory.includes('dinner') || aSubcategory.includes('meals');
            const bIsLunchDinner = bSubcategory.includes('lunch') || bSubcategory.includes('dinner') || bSubcategory.includes('meals');
            if (aIsLunchDinner && !bIsLunchDinner) return -1;
            if (!aIsLunchDinner && bIsLunchDinner) return 1;
          }
        }
        
        // Then sort by distance within the same online status
        return a.distance - b.distance;
      });
      
      setRestaurants(sortedRestaurants);
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
        <div className="animate-pulse">Loading...</div>
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

  // Filter restaurants by search query
  const filteredRestaurants = searchQuery 
    ? restaurants.filter(r => 
        r.seller_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : restaurants;

  if (filteredRestaurants.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {searchQuery 
            ? `No restaurants found matching "${searchQuery}"`
            : "No sellers found in this category within 10km of your location"
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
      {filteredRestaurants.map(restaurant => (
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