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
  description?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: WholesaleProduct;
}

const WholesaleProductViewModal = ({ open, onClose, product }: Props) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentImg, setCurrentImg] = useState(0);

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
    setCurrentImg(0);
  }, [product.id]);

  // Auto-scroll images
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImg(prev => (prev + 1) % images.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [images.length]);

  const discount = product.mrp > product.selling_price ? product.mrp - product.selling_price : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.product_name}</DialogTitle>
        </DialogHeader>

        {images.length > 0 && (
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={images[currentImg]}
              className="w-full h-48 object-cover"
              alt={product.product_name}
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentImg ? 'bg-primary' : 'bg-white/60'}`}
                    onClick={() => setCurrentImg(i)}
                  />
                ))}
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 bg-green-600 text-white text-xs">
                ₹{discount} OFF
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">₹{product.selling_price}</span>
            {discount > 0 && (
              <span className="text-muted-foreground line-through text-sm">MRP ₹{product.mrp}</span>
            )}
          </div>

          {/* Description */}
          {(product as any).description && (
            <div>
              <p className="text-sm text-muted-foreground">{(product as any).description}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-2 text-sm border-t pt-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WholesaleProductViewModal;
