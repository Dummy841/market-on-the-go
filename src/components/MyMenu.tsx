import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import EditItemModal from './EditItemModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Item {
  id: string;
  item_name: string;
  item_photo_url?: string;
  seller_price: number;
  franchise_price: number;
  is_active?: boolean;
  item_info?: string | null;
  created_at: string;
  subcategory_id?: string | null;
}

const MyMenu = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const { seller } = useSellerAuth();

  useEffect(() => {
    if (seller) {
      fetchItems();
    }
  }, [seller]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('seller_id', seller?.id)
        .order('created_at', { ascending: false });

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
      const { error } = await supabase
        .from('items')
        .update({ is_active: !currentStatus })
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === itemId ? { ...item, is_active: !currentStatus } : item
      ));

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
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading menu...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-muted-foreground">No items added yet</h3>
        <p className="text-sm text-muted-foreground mt-2">Add your first item to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Menu ({items.length} items)</h2>
      </div>
      
      {/* Table Layout */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                {/* Thumbnail */}
                <TableCell>
                  {item.item_photo_url ? (
                    <img 
                      src={item.item_photo_url} 
                      alt={item.item_name}
                      className="w-12 h-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No img
                    </div>
                  )}
                </TableCell>
                
                {/* Item Name */}
                <TableCell className="font-medium">
                  <div>
                    <p className="line-clamp-1">{item.item_name}</p>
                    {item.item_info && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.item_info}</p>
                    )}
                  </div>
                </TableCell>
                
                {/* Price */}
                <TableCell className="text-right font-medium">
                  ₹{item.seller_price}
                </TableCell>
                
                {/* Status */}
                <TableCell className="text-center">
                  <Badge variant={item.is_active !== false ? "default" : "secondary"}>
                    {item.is_active !== false ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                
                {/* Actions */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingItem(item);
                        setShowEditModal(true);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant={item.is_active !== false ? "outline" : "default"} 
                      size="sm"
                      onClick={() => toggleItemStatus(item.id, item.is_active !== false)}
                    >
                      {item.is_active !== false ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditItemModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        item={editingItem}
        onSuccess={fetchItems}
      />
    </div>
  );
};

export default MyMenu;
