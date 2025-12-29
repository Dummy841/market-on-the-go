import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

interface Item {
  id: string;
  item_name: string;
  seller_price: number;
  item_photo_url: string | null;
  is_active: boolean;
}

interface AddMoreItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  targetAmount: number;
  currentTotal: number;
}

export const AddMoreItemsModal = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  targetAmount,
  currentTotal
}: AddMoreItemsModalProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addToCart, cartItems } = useCart();

  const amountNeeded = Math.max(0, targetAmount - currentTotal);

  useEffect(() => {
    if (isOpen && sellerId) {
      fetchItems();
    }
  }, [isOpen, sellerId]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('seller_price', { ascending: true })
        .limit(10);

      if (error) throw error;
      
      // Filter out items already in cart
      const cartItemIds = cartItems.map(item => item.id);
      const filteredItems = (data || []).filter(item => !cartItemIds.includes(item.id));
      setItems(filteredItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = (item: Item) => {
    addToCart({
      id: item.id,
      item_name: item.item_name,
      seller_price: item.seller_price,
      item_photo_url: item.item_photo_url,
      seller_id: sellerId,
      seller_name: sellerName
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Add items worth ₹{amountNeeded} more
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-1">
            to remove small order fee
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No more items available
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.item_photo_url ? (
                    <img
                      src={item.item_photo_url}
                      alt={item.item_name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No img</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-sm text-muted-foreground">₹{item.seller_price}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 border-green-600 text-green-600 hover:bg-green-50"
                  onClick={() => handleAddItem(item)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={onClose}
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};
