import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { calculateDistance, getDeliveryTime, formatDistance } from '@/lib/distanceUtils';
import restaurant1 from "@/assets/restaurant-1.jpg";

interface Seller {
  id: string;
  seller_name: string;
  profile_photo_url: string | null;
  is_online?: boolean;
  seller_latitude?: number;
  seller_longitude?: number;
  distance?: number;
  deliveryTime?: string;
}

interface HomeCategorySellersProps {
  title: string;
  category: string;
  userLocation: { lat: number; lng: number } | null;
}

export const HomeCategorySellers = ({ title, category, userLocation }: HomeCategorySellersProps) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userLocation) {
      fetchSellers();
    }
  }, [userLocation, category]);

  const fetchSellers = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
        .select('id, seller_name, profile_photo_url, is_online, seller_latitude, seller_longitude, category, categories')
        .eq('status', 'approved')
        .or(`categories.ilike.%${category}%,category.eq.${category}`);

      if (error) throw error;

      // Calculate distances for each seller
      const sellersWithDistance = (data || []).map((seller) => {
        let distance = 0;
        if (seller.seller_latitude && seller.seller_longitude) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            parseFloat(seller.seller_latitude.toString()),
            parseFloat(seller.seller_longitude.toString())
          );
        }
        return {
          ...seller,
          distance,
          deliveryTime: getDeliveryTime(distance)
        };
      });

      // Filter sellers within 10km and sort by distance
      const nearbySellers = sellersWithDistance
        .filter(s => s.distance <= 10 || s.seller_name === 'Demo Restaurant')
        .sort((a, b) => {
          // Online first
          if (a.is_online !== false && b.is_online === false) return -1;
          if (a.is_online === false && b.is_online !== false) return 1;
          return a.distance - b.distance;
        })
        .slice(0, 10); // Limit to 10 sellers

      setSellers(nearbySellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSellerClick = (sellerId: string) => {
    navigate(`/restaurant/${sellerId}`);
  };

  const handleViewAll = () => {
    navigate(`/restaurants?category=${category}`);
  };

  if (loading) {
    return (
      <section className="py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="min-w-[140px] h-[160px] bg-muted animate-pulse rounded-xl flex-shrink-0" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (sellers.length === 0) {
    return null; // Don't show section if no sellers
  }

  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button 
            onClick={handleViewAll}
            className="flex items-center text-sm text-primary font-medium hover:underline"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {sellers.map((seller) => (
              <div
                key={seller.id}
                onClick={() => handleSellerClick(seller.id)}
                className={`min-w-[140px] flex-shrink-0 cursor-pointer group ${
                  seller.is_online === false ? 'opacity-60' : ''
                }`}
              >
                <div className="relative rounded-xl overflow-hidden bg-card shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="aspect-square">
                    <img
                      src={seller.profile_photo_url || restaurant1}
                      alt={seller.seller_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {seller.is_online === false && (
                    <div className="absolute top-2 left-2 bg-destructive/90 text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded">
                      Offline
                    </div>
                  )}
                  {seller.is_online !== false && seller.deliveryTime && (
                    <div className="absolute bottom-2 left-2 bg-background/90 text-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {seller.deliveryTime}
                    </div>
                  )}
                </div>
                <div className="mt-2 px-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{seller.seller_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(seller.distance || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
};