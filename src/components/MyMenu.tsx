import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
interface Item {
  id: string;
  item_name: string;
  item_photo_url?: string;
  seller_price: number;
  franchise_price: number;
  is_active?: boolean;
  created_at: string;
}
const MyMenu = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  const {
    seller
  } = useSellerAuth();
  useEffect(() => {
    if (seller) {
      fetchItems();
    }
  }, [seller]);
  const fetchItems = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('items').select('*').eq('seller_id', seller?.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch items"
      });
    } finally {
      setLoading(false);
    }
  };
  const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const {
        error
      } = await supabase.from('items').update({
        is_active: !currentStatus
      }).eq('id', itemId);
      if (error) throw error;
      setItems(items.map(item => item.id === itemId ? {
        ...item,
        is_active: !currentStatus
      } : item));
      toast({
        title: "Success",
        description: `Item ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item status"
      });
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading menu...</div>
      </div>;
  }
  if (items.length === 0) {
    return <div className="text-center p-8">
        <h3 className="text-lg font-medium text-muted-foreground">No items added yet</h3>
        <p className="text-sm text-muted-foreground mt-2">Add your first item to get started</p>
      </div>;
  }
  return <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Menu ({items.length} items)</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => <Card key={item.id} className="overflow-hidden">
            {item.item_photo_url && <div className="h-48 bg-muted">
                <img src={item.item_photo_url} alt={item.item_name} className="w-full h-full object-cover" />
              </div>}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.item_name}</CardTitle>
                <Badge variant={item.is_active !== false ? "default" : "secondary"}>
                  {item.is_active !== false ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seller Price:</span>
                <span className="font-medium">₹{item.seller_price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Franchise Price:</span>
                <span className="font-medium">₹{item.franchise_price}</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant={item.is_active !== false ? "outline" : "default"} size="sm" className="flex-1" onClick={() => toggleItemStatus(item.id, item.is_active !== false)}>
                  {item.is_active !== false ? "Deactivate" : "Activate"}
                </Button>
                
                
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};
export default MyMenu;