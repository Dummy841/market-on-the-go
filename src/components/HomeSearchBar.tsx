import { useState, useEffect, useRef } from 'react';
import { Search, Mic, X, MicOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { HomeProductCard } from './HomeProductCard';
import { HomeSellerCard } from './HomeSellerCard';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { Badge } from '@/components/ui/badge';

interface SearchItem {
  id: string;
  item_name: string;
  seller_price: number;
  item_photo_url: string | null;
  item_info: string | null;
  is_active: boolean;
  seller_id: string;
  seller_name: string;
  seller_is_online: boolean;
}

interface SearchSeller {
  id: string;
  seller_name: string;
  owner_name: string;
  profile_photo_url: string | null;
  is_online: boolean;
}

export const HomeSearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searchSellers, setSearchSellers] = useState<SearchSeller[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    isSupported,
  } = useVoiceSearch();

  // Update search query when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
    }
  }, [transcript]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchItems([]);
        setSearchSellers([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setShowResults(true);
    
    try {
      // Search items by name and description (item_info)
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
          sellers!inner(seller_name, is_online, status)
        `)
        .eq('sellers.status', 'approved')
        .or(`item_name.ilike.%${query}%,item_info.ilike.%${query}%`)
        .limit(10);

      if (itemsError) throw itemsError;

      const formattedItems: SearchItem[] = (itemsData || []).map(item => ({
        id: item.id,
        item_name: item.item_name,
        seller_price: item.seller_price,
        item_photo_url: item.item_photo_url,
        item_info: item.item_info,
        is_active: item.is_active,
        seller_id: item.seller_id,
        seller_name: (item.sellers as any).seller_name,
        seller_is_online: (item.sellers as any).is_online,
      }));

      setSearchItems(formattedItems);

      // Search sellers by name
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('id, seller_name, owner_name, profile_photo_url, is_online')
        .eq('status', 'approved')
        .ilike('seller_name', `%${query}%`)
        .limit(5);

      if (sellersError) throw sellersError;
      setSearchSellers(sellersData || []);

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchItems([]);
    setSearchSellers([]);
    setShowResults(false);
  };

  const handleVoiceClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div ref={searchRef} className="sticky top-16 z-40 bg-background border-b px-4 py-3">
      <div className="relative">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search items, products, sellers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
            className="pl-10 pr-20 h-12 rounded-full border-2"
          />
          
          {/* Clear and Voice buttons */}
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isListening ? 'text-red-500 animate-pulse' : 'text-primary'}`}
                onClick={handleVoiceClick}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150" />
            </div>
            <span className="text-sm text-red-700">Listening... Speak now</span>
          </div>
        )}

        {/* Search Results Dropdown */}
        {showResults && !isListening && (searchItems.length > 0 || searchSellers.length > 0 || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-lg max-h-[70vh] overflow-y-auto z-50">
            {isSearching ? (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Searching...</p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
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
                {searchItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      Products
                      <Badge variant="secondary">{searchItems.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {searchItems.map(item => (
                        <HomeProductCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {searchItems.length === 0 && searchSellers.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">
                      No results found for "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
