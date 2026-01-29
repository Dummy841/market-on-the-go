import { useState, useEffect } from 'react';
import { Eye, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { HomeProductCard } from './HomeProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Seller {
  id: string;
  seller_name: string;
  owner_name: string;
  profile_photo_url: string | null;
  is_online: boolean;
  seller_latitude?: number | null;
  seller_longitude?: number | null;
}

interface SellerItem {
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

interface HomeSellerCardProps {
  seller: Seller;
  onClose?: () => void;
}

export const HomeSellerCard = ({ seller, onClose }: HomeSellerCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<SellerItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSellerItems = async () => {
    if (items.length > 0) return; // Already fetched

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, item_name, seller_price, item_photo_url, item_info, is_active')
        .eq('seller_id', seller.id)
        .eq('is_active', true);

      if (error) throw error;

      const formattedItems: SellerItem[] = (data || []).map(item => ({
        ...item,
        seller_id: seller.id,
        seller_name: seller.seller_name,
        seller_is_online: seller.is_online,
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error('Error fetching seller items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = () => {
    if (!expanded) {
      fetchSellerItems();
    }
    setExpanded(!expanded);
  };

  return (
    <Card className="overflow-hidden">
      {/* Seller Info */}
      <div className="flex items-center p-4 gap-3">
        <img
          src={seller.profile_photo_url || '/placeholder.svg'}
          alt={seller.seller_name}
          className={`w-14 h-14 rounded-full object-cover ${!seller.is_online ? 'grayscale' : ''}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{seller.seller_name}</h3>
            <Badge 
              variant={seller.is_online ? "default" : "secondary"}
              className={seller.is_online ? "bg-green-600" : ""}
            >
              {seller.is_online ? "Online" : "Offline"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Owner: {seller.owner_name}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewClick}
          className="shrink-0"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
          {expanded ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>
      </div>

      {/* Expanded Products View */}
      {expanded && (
        <div className="border-t bg-muted/30 p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {items.map(item => (
                <HomeProductCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No products available
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
