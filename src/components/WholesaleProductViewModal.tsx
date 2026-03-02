import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface WholesaleProduct {
  id: string;
  product_name: string;
  barcode: string;
  category: string | null;
  purchase_price: number;
  mrp: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
  gst_percentage: number;
  show_in_quick_add: boolean;
  is_active: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: WholesaleProduct;
}

const WholesaleProductViewModal = ({ open, onClose, product }: Props) => {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from('wholesale_product_images' as any)
        .select('image_url')
        .eq('product_id', product.id)
        .order('display_order');
      if (data) setImages((data as any[]).map(d => d.image_url));
    };
    fetchImages();
  }, [product.id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product.product_name}</DialogTitle>
        </DialogHeader>

        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((url, i) => (
              <img key={i} src={url} className="w-24 h-24 rounded-lg object-cover border flex-shrink-0" />
            ))}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Barcode</span><span className="font-mono">{product.barcode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{product.category || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Purchase Price</span><span>₹{product.purchase_price}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">MRP</span><span>₹{product.mrp}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Selling Price</span><span className="font-bold">₹{product.selling_price}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className={product.stock_quantity <= product.low_stock_alert ? 'text-destructive font-bold' : ''}>{product.stock_quantity}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Low Stock Alert</span><span>{product.low_stock_alert}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{product.gst_percentage}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Quick Add</span><Badge variant={product.show_in_quick_add ? 'default' : 'secondary'}>{product.show_in_quick_add ? 'Yes' : 'No'}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'Active' : 'Inactive'}</Badge></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WholesaleProductViewModal;
