import { useState } from 'react';
import { Plus, Minus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import ItemImageCarousel from '@/components/ItemImageCarousel';
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
    mrp?: number;
    item_photo_url: string | null;
    item_info?: string | null;
    is_active: boolean;
    stock_quantity?: number;
    seller_id: string;
    seller_name: string;
    seller_is_online: boolean;
    images?: string[];
  };
}

export const HomeProductCard = ({ item }: HomeProductCardProps) => {
  const { addToCart, cartItems, cartRestaurant, removeFromCart, updateQuantity } = useCart();
  const [showInfo, setShowInfo] = useState(false);

  const isOutOfStock = (item.stock_quantity ?? 0) <= 0;
  const isAvailable = item.is_active && !isOutOfStock;
  const cartItem = cartItems.find(ci => ci.id === item.id);
  const quantity = cartItem?.quantity || 0;
  const mrp = item.mrp || 0;
  const discountPercent = mrp > item.seller_price ? Math.round(((mrp - item.seller_price) / mrp) * 100) : 0;

  // Build images array
  const images = item.images && item.images.length > 0 
    ? item.images 
    : item.item_photo_url ? [item.item_photo_url] : [];

  const handleAddToCart = () => {
    if (cartRestaurant && cartRestaurant !== item.seller_id) {
      toast({
        title: "Different Seller",
        description: "You can order from a single seller at a time.",
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
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateQuantity(item.id, quantity + 1);
    } else {
      handleAddToCart();
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(item.id, quantity - 1);
    } else {
      removeFromCart(item.id);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl overflow-hidden shadow-sm border">
        {/* Product Image with Carousel */}
        <div className="relative aspect-square">
          {images.length > 0 ? (
            <div className={`w-full h-full ${!isAvailable ? 'grayscale opacity-60' : ''}`}>
              <ItemImageCarousel images={images} alt={item.item_name} />
            </div>
          ) : (
            <div className={`w-full h-full bg-muted flex items-center justify-center ${!isAvailable ? 'grayscale opacity-60' : ''}`}>
              <span className="text-muted-foreground text-xs">No image</span>
            </div>
          )}
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white text-xs font-medium px-2 py-1 bg-destructive rounded">
                Unavailable
              </span>
            </div>
          )}
          {/* Discount Badge */}
          {mrp > item.seller_price && (
            <div className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              ₹{Math.round(mrp - item.seller_price)} OFF
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
        <div className="p-1.5">
          <h3 className="font-medium text-[11px] line-clamp-2 min-h-[1.5rem] leading-tight">
            {item.item_name}
          </h3>
          <p className="text-[10px] text-muted-foreground truncate mb-1">
            {item.seller_name}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary">
                <span className="text-[9px] font-normal">Sale </span>₹{item.seller_price}
              </span>
              {mrp > item.seller_price && (
                <span className="text-[10px] text-muted-foreground line-through">
                  MRP ₹{mrp}
                </span>
              )}
            </div>
            
            {quantity > 0 ? (
              <div className="flex items-center gap-0 border rounded overflow-hidden">
                <button
                  onClick={handleDecrement}
                  className="h-6 w-6 flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                  disabled={!isAvailable}
                >
                  <Minus className="h-2.5 w-2.5 text-primary" />
                </button>
                <span className="h-6 w-5 flex items-center justify-center text-[11px] font-bold">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  className="h-6 w-6 flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                  disabled={!isAvailable}
                >
                  <Plus className="h-2.5 w-2.5 text-primary" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                className="h-6 px-2 text-[11px] bg-primary hover:bg-primary/90"
                onClick={handleAddToCart}
                disabled={!isAvailable}
              >
                ADD
              </Button>
            )}
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
            {images.length > 0 && (
              <div className="w-full h-48 rounded-lg overflow-hidden">
                <ItemImageCarousel images={images} alt={item.item_name} />
              </div>
            )}
            <p className="text-muted-foreground text-sm">{item.item_info}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">₹{item.seller_price}</span>
                {mrp > item.seller_price && (
                  <span className="text-sm text-muted-foreground line-through">₹{mrp}</span>
                )}
              </div>
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
