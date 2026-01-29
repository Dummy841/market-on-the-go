import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HomeProductCard } from './HomeProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateDistance } from '@/lib/distanceUtils';

interface Item {
  id: string;
  item_name: string;
  seller_price: number;
  item_photo_url: string | null;
  item_info: string | null;
  is_active: boolean;
  seller_id: string;
  seller_name: string;
  seller_is_online: boolean;
  seller_latitude: number | null;
  seller_longitude: number | null;
  category: string;
  distance?: number;
}

interface HomeProductsGridProps {
  userLocation: { lat: number; lng: number } | null;
}

export const HomeProductsGrid = ({ userLocation }: HomeProductsGridProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});

  useEffect(() => {
    fetchProducts();
  }, [userLocation]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Fetch active modules
      const { data: modules, error: modulesError } = await supabase
        .from('service_modules')
        .select('slug')
        .eq('is_active', true);

      if (modulesError) throw modulesError;

      const activeCategories = modules?.map(m => m.slug) || [];

      if (activeCategories.length === 0) {
        setItems([]);
        setGroupedItems({});
        setLoading(false);
        return;
      }

      // Fetch items from sellers in active categories
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          item_name,
          seller_price,
          item_photo_url,
          item_info,
          is_active,
          seller_id,
          sellers!inner(
            seller_name,
            is_online,
            seller_latitude,
            seller_longitude,
            category,
            categories,
            status
          )
        `)
        .eq('is_active', true)
        .eq('sellers.status', 'approved');

      if (itemsError) throw itemsError;

      // Transform and filter items
      let formattedItems: Item[] = (itemsData || [])
        .filter(item => {
          const seller = item.sellers as any;
          // Check if seller belongs to any active category
          const sellerCategory = seller.category;
          const sellerCategories = seller.categories ? seller.categories.split(',').map((c: string) => c.trim()) : [];
          return activeCategories.includes(sellerCategory) || 
                 sellerCategories.some((c: string) => activeCategories.includes(c));
        })
        .map(item => {
          const seller = item.sellers as any;
          return {
            id: item.id,
            item_name: item.item_name,
            seller_price: item.seller_price,
            item_photo_url: item.item_photo_url,
            item_info: item.item_info,
            is_active: item.is_active,
            seller_id: item.seller_id,
            seller_name: seller.seller_name,
            seller_is_online: seller.is_online,
            seller_latitude: seller.seller_latitude,
            seller_longitude: seller.seller_longitude,
            category: seller.category,
          };
        });

      // Filter by distance if user location available
      if (userLocation) {
        formattedItems = formattedItems
          .map(item => {
            if (item.seller_latitude && item.seller_longitude) {
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                item.seller_latitude,
                item.seller_longitude
              );
              return { ...item, distance };
            }
            return { ...item, distance: Infinity };
          })
          .filter(item => item.distance !== undefined && item.distance <= 10)
          .sort((a, b) => {
            // Sort by online status first, then by distance
            if (a.seller_is_online !== b.seller_is_online) {
              return a.seller_is_online ? -1 : 1;
            }
            return (a.distance || 0) - (b.distance || 0);
          });
      }

      // Group items by category
      const grouped: Record<string, Item[]> = {};
      formattedItems.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      });

      setItems(formattedItems);
      setGroupedItems(grouped);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTitle = (slug: string): string => {
    const titles: Record<string, string> = {
      instamart: 'Instamart - Quick Delivery',
      dairy: 'Dairy Products - Fresh Daily',
      food_delivery: 'Food Delivery',
      services: 'Services',
    };
    return titles[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">
          No products available in your area
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold mb-3">
            {getCategoryTitle(category)}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {categoryItems.map(item => (
              <HomeProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
