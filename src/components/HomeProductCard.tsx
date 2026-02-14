import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HomeProductCardProps {
  item: {
    id: string;
    item_name: string;
    seller_price: number;
    item_photo_url: string | null;
    item_info?: string | null;
    is_active: boolean;
    seller_id: string;
    seller_name: string;
    seller_is_online: boolean;
  };
}

export const HomeProductCard = ({ item }: HomeProductCardProps) => {
  const { addToCart, cartItems, cartRestaurant } = useCart();
  const [showInfo, setShowInfo] = useState(false);

  const isAvailable = item.is_active && item.seller_is_online;
  const isInCart = cartItems.some(cartItem => cartItem.id === item.id);

  const handleAddToCart = () => {
    // Check if adding item from different seller
    if (cartRestaurant && cartRestaurant !== item.seller_id) {
      toast({
        title: "Different Seller",
        description: "You can order from a single seller at a time. You are trying to add items from a different seller.",
        variant: "destructive",
      });
      return;
    }

    addToCart({
      id: item.id,
      item_name: item.item_name,
      seller_price: item.seller_price,
      item_photo_url: item.item_photo_url,
      seller_id: item.seller_id,
      seller_name: item.seller_name,
    });

    toast({
      title: "Added to cart",
      description: `${item.item_name} added to cart`,
    });
  };

  return (
    <>
      <div className="bg-card rounded-xl overflow-hidden shadow-sm border">
        {/* Product Image */}
        <div className="relative aspect-square">
          <img
            src={item.item_photo_url || '/placeholder.svg'}
            alt={item.item_name}
            className={`w-full h-full object-cover ${!isAvailable ? 'grayscale opacity-60' : ''}`}
          />
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white text-xs font-medium px-2 py-1 bg-destructive rounded">
                Unavailable
              </span>
            </div>
          )}
          {item.item_info && (
            <button
              onClick={() => setShowInfo(true)}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-full"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Product Details */}
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
            {item.item_name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mb-2">
            {item.seller_name}
          </p>
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent">
              ₹{item.seller_price}
            </Badge>
            
            <Button
              size="sm"
              variant={isInCart ? "secondary" : "default"}
              className={`h-8 px-3 ${!isInCart ? 'bg-primary hover:bg-primary/90' : ''}`}
              onClick={handleAddToCart}
              disabled={!isAvailable}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isInCart ? 'Added' : 'ADD'}
            </Button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{item.item_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <img
              src={item.item_photo_url || '/placeholder.svg'}
              alt={item.item_name}
              className="w-full h-48 object-cover rounded-lg"
            />
            <p className="text-muted-foreground text-sm">{item.item_info}</p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                ₹{item.seller_price}
              </Badge>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  handleAddToCart();
                  setShowInfo(false);
                }}
                disabled={!isAvailable}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
