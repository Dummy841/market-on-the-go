import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HomeProductCard } from './HomeProductCard';
import { HomeSellerCard } from './HomeSellerCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { calculateDistance } from '@/lib/distanceUtils';

interface Item {
  id: string;
  item_name: string;
  seller_price: number;
  mrp: number;
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
  images: string[];
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
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});
  const [searchSellers, setSearchSellers] = useState<Seller[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; image_url: string | null }[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [userLocation, searchQuery, selectedSubcategory]);

  // Real-time subscription for seller online/offline status changes
  useEffect(() => {
    const channel = supabase
      .channel('seller-status-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sellers', filter: 'status=eq.approved' },
        (payload) => {
          const updatedSeller = payload.new as any;
          const oldSeller = payload.old as any;
          // Only react to is_online changes
          if (updatedSeller.is_online !== oldSeller.is_online) {
            // Update items in state without refetching
            setItems(prev => prev.map(item => 
              item.seller_id === updatedSeller.id 
                ? { ...item, seller_is_online: updatedSeller.is_online }
                : item
            ));
            setAllItems(prev => prev.map(item => 
              item.seller_id === updatedSeller.id 
                ? { ...item, seller_is_online: updatedSeller.is_online }
                : item
            ));
            // Update grouped items too
            setGroupedItems(prev => {
              const updated: Record<string, Item[]> = {};
              Object.entries(prev).forEach(([key, items]) => {
                updated[key] = items.map(item => 
                  item.seller_id === updatedSeller.id 
                    ? { ...item, seller_is_online: updatedSeller.is_online }
                    : item
                );
              });
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);

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

      const { data: subcategoriesData } = await supabase
        .from('subcategories')
        .select('id, name, category, image_url')
        .eq('is_active', true)
        .order('display_order');

      const subcategoryMap = new Map<string, { name: string; category: string }>();
      const subcatList: { id: string; name: string; image_url: string | null }[] = [];
      subcategoriesData?.forEach(sub => {
        subcategoryMap.set(sub.id, { name: sub.name, category: sub.category });
        subcatList.push({ id: sub.id, name: sub.name, image_url: (sub as any).image_url || null });
      });
      setSubcategories(subcatList);

      let itemsQuery = supabase
        .from('items')
        .select(`
          id,
          item_name,
          seller_price,
          mrp,
          item_photo_url,
          item_info,
          is_active,
          seller_id,
          subcategory_id,
          seller_item_images(image_url, display_order),
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
        .eq('sellers.status', 'approved')
        .in('sellers.seller_type', ['online', 'both']);

      // Apply search filter - split into words for fuzzy matching
      if (searchQuery) {
        const words = searchQuery.trim().split(/\s+/).filter(w => w.length >= 2);
        if (words.length > 0) {
          const orFilter = words.map(w => `item_name.ilike.%${w}%,item_info.ilike.%${w}%`).join(',');
          itemsQuery = itemsQuery.or(orFilter);
        } else {
          itemsQuery = itemsQuery.or(`item_name.ilike.%${searchQuery}%,item_info.ilike.%${searchQuery}%`);
        }
      }

      const { data: itemsData, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      let formattedItems: Item[] = (itemsData || [])
        .filter(item => {
          const seller = item.sellers as any;
          const sellerCategory = seller.category;
          const sellerCategories = seller.categories ? seller.categories.split(',').map((c: string) => c.trim()) : [];
          return activeCats.includes(sellerCategory) || sellerCategories.some((c: string) => activeCats.includes(c));
        })
        .map(item => {
          const seller = item.sellers as any;
          const subcatInfo = item.subcategory_id ? subcategoryMap.get(item.subcategory_id) : null;
          const extraImages = (item.seller_item_images as any[] || [])
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((img: any) => img.image_url);
          const allImages = item.item_photo_url 
            ? [item.item_photo_url, ...extraImages.filter((url: string) => url !== item.item_photo_url)]
            : extraImages;
          return {
            id: item.id,
            item_name: item.item_name,
            seller_price: item.seller_price,
            mrp: item.mrp || 0,
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
            images: allImages,
          };
        });

      if (userLocation) {
        formattedItems = formattedItems
          .map(item => {
            if (item.seller_latitude && item.seller_longitude) {
              const distance = calculateDistance(userLocation.lat, userLocation.lng, item.seller_latitude, item.seller_longitude);
              return { ...item, distance };
            }
            return { ...item, distance: Infinity };
          })
          .sort((a, b) => {
            if (a.seller_is_online !== b.seller_is_online) return a.seller_is_online ? -1 : 1;
            return (a.distance || 0) - (b.distance || 0);
          });
      }

      setAllItems(formattedItems);

      if (selectedSubcategory) {
        formattedItems = formattedItems.filter(item => item.subcategory_id === selectedSubcategory);
      }

      if (searchQuery) {
        const words = searchQuery.trim().split(/\s+/).filter(w => w.length >= 2);
        const sellerSearchTerm = words.length > 0 ? words[0] : searchQuery;
        
        const { data: sellersData } = await supabase
          .from('sellers')
          .select('id, seller_name, owner_name, profile_photo_url, is_online, category, categories')
          .eq('status', 'approved')
          .in('seller_type', ['online', 'both'])
          .ilike('seller_name', `%${sellerSearchTerm}%`)
          .limit(10);

        const filteredSellers = (sellersData || []).filter(seller => {
          const sellerCategory = seller.category;
          const sellerCategories = seller.categories ? seller.categories.split(',').map((c: string) => c.trim()) : [];
          return activeCats.includes(sellerCategory) || sellerCategories.some((c: string) => activeCats.includes(c));
        }).slice(0, 5);

        setSearchSellers(filteredSellers);
        setGroupedItems({});
        setItems(formattedItems);
      } else {
        setSearchSellers([]);
        const grouped: Record<string, Item[]> = {};
        formattedItems.forEach(item => {
          const groupKey = item.subcategory_name || 'Other';
          if (!grouped[groupKey]) grouped[groupKey] = [];
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
      <div className="px-3 py-3">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-2 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (searchQuery) {
    const hasResults = items.length > 0 || searchSellers.length > 0;
    if (!hasResults) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
        </div>
      );
    }

    return (
      <div className="px-3 py-3 space-y-4">
        {searchSellers.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              Sellers
              <Badge variant="secondary" className="text-[10px]">{searchSellers.length}</Badge>
            </h3>
            <div className="space-y-2">
              {searchSellers.map(seller => (
                <HomeSellerCard key={seller.id} seller={seller} />
              ))}
            </div>
          </div>
        )}
        {items.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              Products
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {items.map(item => (
                <HomeProductCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const subcategoriesWithProducts = subcategories.filter(sub =>
    allItems.some(item => item.subcategory_id === sub.id)
  );

  const SubcategoryBar = () => {
    if (subcategoriesWithProducts.length === 0 || items.length === 0) return null;
    return (
      <div className="sticky z-[97] bg-background px-3 pt-1.5 pb-1" style={{ top: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedSubcategory(null)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center ${
              selectedSubcategory === null ? 'border-orange-500' : 'border-muted'
            }`}>
              <span className="text-xl">🏠</span>
            </div>
            <span className={`text-[11px] font-medium leading-tight text-center max-w-[70px] truncate ${
              selectedSubcategory === null ? 'text-orange-600' : 'text-muted-foreground'
            }`}>All</span>
          </button>
          {subcategoriesWithProducts.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubcategory(sub.id === selectedSubcategory ? null : sub.id)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                selectedSubcategory === sub.id ? 'border-orange-500' : 'border-muted'
              }`}>
                {sub.image_url ? (
                  <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-xl">🍽️</span>
                  </div>
                )}
              </div>
              <span className={`text-[11px] font-medium leading-tight text-center max-w-[70px] truncate ${
                selectedSubcategory === sub.id ? 'text-orange-600' : 'text-muted-foreground'
              }`}>{sub.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div>
        <SubcategoryBar />
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">No products available in your area</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <SubcategoryBar />
      <div className="px-3 py-1 space-y-4">
        {selectedSubcategory ? (
          <div className="grid grid-cols-3 gap-2">
            {items.map(item => (
              <HomeProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          subcategories
            .filter(sub => groupedItems[sub.name])
            .map(sub => (
              <div key={sub.id}>
                <h2 className="text-sm font-semibold mb-2">{sub.name}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {groupedItems[sub.name].map(item => (
                    <HomeProductCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))
            .concat(
              groupedItems['Other'] ? [
                <div key="other">
                  <h2 className="text-sm font-semibold mb-2">Other</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {groupedItems['Other'].map(item => (
                      <HomeProductCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ] : []
            )
        )}
      </div>
    </div>
  );
};
