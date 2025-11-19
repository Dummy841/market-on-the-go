import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RestaurantCard } from './RestaurantCard';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import restaurant1 from '@/assets/restaurant-1.jpg';

interface SearchItem {
  id: string;
  item_name: string;
  seller_price: number;
  item_photo_url: string | null;
  is_active: boolean;
  seller_id: string;
  seller_name: string;
  seller_is_online: boolean;
}

interface SearchRestaurant {
  id: string;
  seller_name: string;
  profile_photo_url: string | null;
  owner_name: string;
  mobile: string;
  is_online: boolean;
}

interface SearchResultsProps {
  searchQuery: string;
  onClose?: () => void;
}

export const SearchResults = ({ searchQuery, onClose }: SearchResultsProps) => {
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searchRestaurants, setSearchRestaurants] = useState<SearchRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchItems([]);
      setSearchRestaurants([]);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Search for items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          item_name,
          seller_price,
          item_photo_url,
          is_active,
          seller_id,
          sellers!inner(seller_name, is_online)
        `)
        .ilike('item_name', `%${searchQuery}%`)
        .eq('sellers.status', 'approved');

      if (itemsError) throw itemsError;

      // Transform items data
      const formattedItems: SearchItem[] = (itemsData || []).map(item => ({
        id: item.id,
        item_name: item.item_name,
        seller_price: item.seller_price,
        item_photo_url: item.item_photo_url,
        is_active: item.is_active,
        seller_id: item.seller_id,
        seller_name: (item.sellers as any).seller_name,
        seller_is_online: (item.sellers as any).is_online,
      }));

      setSearchItems(formattedItems);

      // Search for restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('sellers')
        .select('id, seller_name, profile_photo_url, owner_name, mobile, is_online')
        .ilike('seller_name', `%${searchQuery}%`)
        .eq('status', 'approved');

      if (restaurantsError) throw restaurantsError;
      setSearchRestaurants(restaurantsData || []);

    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: SearchItem) => {
    addToCart({
      id: item.id,
      item_name: item.item_name,
      seller_price: item.seller_price,
      item_photo_url: item.item_photo_url,
      seller_id: item.seller_id,
      seller_name: item.seller_name,
    });
  };

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}`);
    onClose?.();
  };

  if (!searchQuery.trim()) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-background border rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-pulse">Searching...</div>
        </div>
      ) : (
        <div className="p-4">
          {/* Items Results */}
          {searchItems.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Items</h3>
              <div className="space-y-3">
                {searchItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex items-center p-3">
                      <img
                        src={item.item_photo_url || restaurant1}
                        alt={item.item_name}
                        className="w-16 h-16 rounded-lg object-cover mr-4"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.item_name}</h4>
                        <p className="text-sm text-muted-foreground">From {item.seller_name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary">₹{item.seller_price}</span>
                            <Badge variant={item.is_active && item.seller_is_online ? "default" : "destructive"}>
                              {item.is_active && item.seller_is_online ? "Available" : "Out of Stock"}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            disabled={!item.is_active || !item.seller_is_online}
                          >
                            {item.is_active && item.seller_is_online ? "Add to Cart" : "Unavailable"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Restaurants Results */}
          {searchRestaurants.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Restaurants</h3>
              <div className="space-y-3">
                {searchRestaurants.map((restaurant) => (
                  <Card key={restaurant.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRestaurantClick(restaurant.id)}>
                    <div className="flex items-center p-3">
                      <img
                        src={restaurant.profile_photo_url || restaurant1}
                        alt={restaurant.seller_name}
                        className={`w-16 h-16 rounded-lg object-cover mr-4 ${!restaurant.is_online ? 'grayscale' : ''}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{restaurant.seller_name}</h4>
                          <Badge variant={restaurant.is_online ? "default" : "secondary"}>
                            {restaurant.is_online ? "Online" : "Offline"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Owner: {restaurant.owner_name}</p>
                        <p className="text-sm text-muted-foreground">{restaurant.is_online ? "Currently accepting orders" : "Currently not taking orders"}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {searchItems.length === 0 && searchRestaurants.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};