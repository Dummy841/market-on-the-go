import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HomeProductCard } from './HomeProductCard';
import { HomeSellerCard } from './HomeSellerCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { calculateDistance } from '@/lib/distanceUtils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
  subcategory_id: string | null;
  subcategory_name: string | null;
  distance?: number;
}

interface Seller {
  id: string;
  seller_name: string;
  owner_name: string;
  profile_photo_url: string | null;
  is_online: boolean;
  category: string;
  categories: string | null;
}

interface HomeProductsGridProps {
  userLocation: { lat: number; lng: number } | null;
  searchQuery?: string;
}

export const HomeProductsGrid = ({ userLocation, searchQuery = '' }: HomeProductsGridProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});
  const [searchSellers, setSearchSellers] = useState<Seller[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [userLocation, searchQuery, selectedSubcategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Fetch active modules
      const { data: modules, error: modulesError } = await supabase
        .from('service_modules')
        .select('slug')
        .eq('is_active', true);

      if (modulesError) throw modulesError;

      const activeCats = modules?.map(m => m.slug) || [];
      setActiveCategories(activeCats);

      if (activeCats.length === 0) {
        setItems([]);
        setGroupedItems({});
        setSearchSellers([]);
        setLoading(false);
        return;
      }

      // Fetch subcategories for grouping
      const { data: subcategoriesData } = await supabase
        .from('subcategories')
        .select('id, name, category')
        .eq('is_active', true);

      const subcategoryMap = new Map<string, { name: string; category: string }>();
      const subcatList: { id: string; name: string }[] = [];
      subcategoriesData?.forEach(sub => {
        subcategoryMap.set(sub.id, { name: sub.name, category: sub.category });
        subcatList.push({ id: sub.id, name: sub.name });
      });
      setSubcategories(subcatList);

      // Build query for items
      let itemsQuery = supabase
        .from('items')
        .select(`
          id,
          item_name,
          seller_price,
          item_photo_url,
          item_info,
          is_active,
          seller_id,
          subcategory_id,
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

      // Apply search filter if query exists
      if (searchQuery) {
        itemsQuery = itemsQuery.or(`item_name.ilike.%${searchQuery}%,item_info.ilike.%${searchQuery}%`);
      }

      const { data: itemsData, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      // Transform and filter items
      let formattedItems: Item[] = (itemsData || [])
        .filter(item => {
          const seller = item.sellers as any;
          // Check if seller belongs to any active category
          const sellerCategory = seller.category;
          const sellerCategories = seller.categories ? seller.categories.split(',').map((c: string) => c.trim()) : [];
          return activeCats.includes(sellerCategory) || 
                 sellerCategories.some((c: string) => activeCats.includes(c));
        })
        .map(item => {
          const seller = item.sellers as any;
          const subcatInfo = item.subcategory_id ? subcategoryMap.get(item.subcategory_id) : null;
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
            subcategory_id: item.subcategory_id,
            subcategory_name: subcatInfo?.name || null,
          };
        });

      // Calculate distance and sort if user location available (no filtering)
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
          .sort((a, b) => {
            // Sort by online status first, then by distance
            if (a.seller_is_online !== b.seller_is_online) {
              return a.seller_is_online ? -1 : 1;
            }
            return (a.distance || 0) - (b.distance || 0);
          });
      }

      // Filter by selected subcategory if any
      if (selectedSubcategory) {
        formattedItems = formattedItems.filter(item => item.subcategory_id === selectedSubcategory);
      }


      if (searchQuery) {
        const { data: sellersData } = await supabase
          .from('sellers')
          .select('id, seller_name, owner_name, profile_photo_url, is_online, category, categories')
          .eq('status', 'approved')
          .ilike('seller_name', `%${searchQuery}%`)
          .limit(10);

        // Filter sellers to only show those from active categories
        const filteredSellers = (sellersData || []).filter(seller => {
          const sellerCategory = seller.category;
          const sellerCategories = seller.categories ? seller.categories.split(',').map((c: string) => c.trim()) : [];
          return activeCats.includes(sellerCategory) || 
                 sellerCategories.some((c: string) => activeCats.includes(c));
        }).slice(0, 5);

        setSearchSellers(filteredSellers);

        // When searching, don't group by subcategory
        setGroupedItems({});
        setItems(formattedItems);
      } else {
        setSearchSellers([]);
        
        // Group items by subcategory name (not category)
        const grouped: Record<string, Item[]> = {};
        formattedItems.forEach(item => {
          // Use subcategory name if available, otherwise use "Other"
          const groupKey = item.subcategory_name || 'Other';
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(item);
        });

        setItems(formattedItems);
        setGroupedItems(grouped);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
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

  // Searching mode - show flat results with sellers
  if (searchQuery) {
    const hasResults = items.length > 0 || searchSellers.length > 0;

    if (!hasResults) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">
            No results found for "{searchQuery}"
          </p>
        </div>
      );
    }

    return (
      <div className="px-4 py-4 space-y-6">
        {/* Sellers Section */}
        {searchSellers.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Sellers
              <Badge variant="secondary">{searchSellers.length}</Badge>
            </h3>
            <div className="space-y-3">
              {searchSellers.map(seller => (
                <HomeSellerCard key={seller.id} seller={seller} />
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {items.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Products
              <Badge variant="secondary">{items.length}</Badge>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {items.map(item => (
                <HomeProductCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter subcategories to only those that have products
  const subcategoriesWithProducts = subcategories.filter(sub =>
    items.some(item => item.subcategory_id === sub.id)
  );

  const SubcategoryBar = () => {
    if (subcategoriesWithProducts.length === 0 || items.length === 0) return null;
    return (
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedSubcategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors ${
              selectedSubcategory === null
                ? 'bg-orange-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            All
          </button>
          {subcategoriesWithProducts.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubcategory(sub.id === selectedSubcategory ? null : sub.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors ${
                selectedSubcategory === sub.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // No products available
  if (items.length === 0) {
    return (
      <div>
        <SubcategoryBar />
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">
            No products available in your area
          </p>
        </div>
      </div>
    );
  }

  // Default: grouped by subcategory
  return (
    <div className="space-y-2">
      <SubcategoryBar />
      <div className="px-4 py-2 space-y-6">
        {selectedSubcategory ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
              <HomeProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          Object.entries(groupedItems).map(([subcategoryName, subcategoryItems]) => (
            <div key={subcategoryName}>
              <h2 className="text-lg font-semibold mb-3">{subcategoryName}</h2>
              <div className="grid grid-cols-2 gap-3">
                {subcategoryItems.map(item => (
                  <HomeProductCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
