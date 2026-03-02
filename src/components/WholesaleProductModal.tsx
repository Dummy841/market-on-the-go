import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Upload, ScanBarcode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: WholesaleProduct | null;
  onSaved: () => void;
}

const WholesaleProductModal = ({ open, onClose, product, onSaved }: Props) => {
  const [form, setForm] = useState({
    product_name: '',
    barcode: '',
    category: '',
    purchase_price: 0,
    mrp: 0,
    selling_price: 0,
    stock_quantity: 0,
    low_stock_alert: 10,
    gst_percentage: 0,
    show_in_quick_add: false,
    is_active: true,
  });
  const [images, setImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubcategories();
    if (product) {
      setForm({
        product_name: product.product_name,
        barcode: product.barcode,
        category: product.category || '',
        purchase_price: product.purchase_price,
        mrp: product.mrp,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        low_stock_alert: product.low_stock_alert,
        gst_percentage: product.gst_percentage,
        show_in_quick_add: product.show_in_quick_add,
        is_active: product.is_active,
      });
      fetchProductImages(product.id);
    } else {
      generateBarcode();
    }
  }, [product]);

  const fetchSubcategories = async () => {
    const { data } = await supabase.from('subcategories').select('id, name, category').eq('is_active', true).order('name');
    if (data) setSubcategories(data);
  };

  const fetchProductImages = async (productId: string) => {
    const { data } = await supabase
      .from('wholesale_product_images' as any)
      .select('*')
      .eq('product_id', productId)
      .order('display_order');
    if (data) setImages((data as any[]).map(d => d.image_url));
  };

  const generateBarcode = async () => {
    try {
      const { data, error } = await supabase
        .from('wholesale_barcode_sequence' as any)
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      const nextBarcode = ((data as any).last_barcode || 10000) + 1;
      setForm(f => ({ ...f, barcode: String(nextBarcode) }));
    } catch (err) {
      console.error('Error generating barcode:', err);
      setForm(f => ({ ...f, barcode: '10001' }));
    }
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'] });
        const detect = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              setForm(f => ({ ...f, barcode: barcodes[0].rawValue }));
              stopScanner();
              toast({ title: 'Barcode Scanned', description: `Barcode: ${barcodes[0].rawValue}` });
              return;
            }
          } catch (e) { /* continue */ }
          if (scanning) requestAnimationFrame(detect);
        };
        requestAnimationFrame(detect);
      } else {
        toast({ variant: 'destructive', title: 'Not Supported', description: 'Barcode scanner not supported. Enter barcode manually.' });
        stopScanner();
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera' });
      setScanning(false);
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = images.length + newImages.length + files.length;
    if (totalImages > 4) {
      toast({ variant: 'destructive', title: 'Max 4 images allowed' });
      return;
    }
    setNewImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of newImages) {
      const ext = file.name.split('.').pop();
      const path = `products/${productId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('wholesale-images').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('wholesale-images').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSave = async () => {
    if (!form.product_name || !form.barcode) {
      toast({ variant: 'destructive', title: 'Required', description: 'Product name and barcode are required' });
      return;
    }
    setSaving(true);
    try {
      let productId = product?.id;

      if (product) {
        const { error } = await supabase
          .from('wholesale_products' as any)
          .update({
            product_name: form.product_name,
            barcode: form.barcode,
            category: form.category || null,
            purchase_price: form.purchase_price,
            mrp: form.mrp,
            selling_price: form.selling_price,
            stock_quantity: form.stock_quantity,
            low_stock_alert: form.low_stock_alert,
            gst_percentage: form.gst_percentage,
            show_in_quick_add: form.show_in_quick_add,
            is_active: form.is_active,
          } as any)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        // Update barcode sequence
        await supabase
          .from('wholesale_barcode_sequence' as any)
          .update({ last_barcode: parseInt(form.barcode) } as any)
          .not('id', 'is', null);

        const { data, error } = await supabase
          .from('wholesale_products' as any)
          .insert({
            product_name: form.product_name,
            barcode: form.barcode,
            category: form.category || null,
            purchase_price: form.purchase_price,
            mrp: form.mrp,
            selling_price: form.selling_price,
            stock_quantity: form.stock_quantity,
            low_stock_alert: form.low_stock_alert,
            gst_percentage: form.gst_percentage,
            show_in_quick_add: form.show_in_quick_add,
            is_active: form.is_active,
          } as any)
          .select()
          .single();
        if (error) throw error;
        productId = (data as any).id;
      }

      // Upload new images
      if (newImages.length > 0 && productId) {
        const uploadedUrls = await uploadImages(productId);
        const allUrls = [...images, ...uploadedUrls];

        // Delete old images and re-insert
        await supabase.from('wholesale_product_images' as any).delete().eq('product_id', productId);
        for (let i = 0; i < allUrls.length; i++) {
          await supabase.from('wholesale_product_images' as any).insert({
            product_id: productId,
            image_url: allUrls[i],
            display_order: i,
          } as any);
        }
      } else if (product && productId) {
        // Update existing images order
        await supabase.from('wholesale_product_images' as any).delete().eq('product_id', productId);
        for (let i = 0; i < images.length; i++) {
          await supabase.from('wholesale_product_images' as any).insert({
            product_id: productId,
            image_url: images[i],
            display_order: i,
          } as any);
        }
      }

      toast({ title: 'Success', description: product ? 'Product updated' : 'Product added' });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { stopScanner(); onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Product Name *</Label>
            <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
          </div>

          <div>
            <Label>Barcode</Label>
            <div className="flex gap-2">
              <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={scanning ? stopScanner : startScanner}>
                <ScanBarcode className="w-4 h-4" />
              </Button>
            </div>
            {scanning && (
              <div className="mt-2 rounded-lg overflow-hidden border">
                <video ref={videoRef} className="w-full h-48 object-cover" />
                <Button size="sm" variant="destructive" className="w-full rounded-none" onClick={stopScanner}>
                  Stop Scanner
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="z-[9999]">
                {subcategories.map(sc => (
                  <SelectItem key={sc.id} value={sc.name}>{sc.name} ({sc.category})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Purchase Price</Label>
              <Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>MRP *</Label>
              <Input type="number" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Selling Price *</Label>
              <Input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Stock Qty</Label>
              <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Low Stock Alert</Label>
              <Input type="number" value={form.low_stock_alert} onChange={e => setForm(f => ({ ...f, low_stock_alert: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>GST %</Label>
              <Input type="number" value={form.gst_percentage} onChange={e => setForm(f => ({ ...f, gst_percentage: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Show in Quick Add</Label>
            <Switch checked={form.show_in_quick_add} onCheckedChange={v => setForm(f => ({ ...f, show_in_quick_add: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>

          {/* Images */}
          <div>
            <Label>Product Images (max 4)</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded border overflow-hidden">
                  <img src={url} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newImages.map((file, i) => (
                <div key={`new-${i}`} className="relative w-20 h-20 rounded border overflow-hidden">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                  <button onClick={() => removeNewImage(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length + newImages.length < 4 && (
                <label className="w-20 h-20 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} multiple />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : product ? 'Update' : 'Add Product'}
            </Button>
            <Button variant="outline" onClick={() => { stopScanner(); onClose(); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WholesaleProductModal;
