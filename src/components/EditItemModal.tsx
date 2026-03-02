import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, ScanBarcode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';

interface Item {
  id: string;
  item_name: string;
  item_photo_url?: string;
  seller_price: number;
  barcode?: string;
  purchase_price?: number;
  mrp?: number;
  stock_quantity?: number;
  low_stock_alert?: number;
  gst_percentage?: number;
  show_in_quick_add?: boolean;
  is_active?: boolean;
  item_info?: string | null;
  subcategory_id?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  category: string;
}

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess?: () => void;
}

const EditItemModal = ({ open, onOpenChange, item, onSuccess }: EditItemModalProps) => {
  const [form, setForm] = useState({
    item_name: '',
    barcode: '',
    purchase_price: '0',
    mrp: '0',
    seller_price: '0',
    stock_quantity: '0',
    low_stock_alert: '10',
    gst_percentage: '0',
    show_in_quick_add: false,
    is_active: true,
    item_info: '',
    subcategory_id: ''
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { seller } = useSellerAuth();

  useEffect(() => {
    if (open && seller) fetchSubcategories();
  }, [open, seller]);

  useEffect(() => {
    if (item && open) {
      setForm({
        item_name: item.item_name,
        barcode: (item as any).barcode || '',
        purchase_price: ((item as any).purchase_price || 0).toString(),
        mrp: (item.mrp || 0).toString(),
        seller_price: item.seller_price.toString(),
        stock_quantity: (item.stock_quantity || 0).toString(),
        low_stock_alert: (item.low_stock_alert || 10).toString(),
        gst_percentage: (item.gst_percentage || 0).toString(),
        show_in_quick_add: (item as any).show_in_quick_add || false,
        is_active: item.is_active !== false,
        item_info: item.item_info || '',
        subcategory_id: item.subcategory_id || ''
      });
      setImageFiles([]);
      // Fetch existing images from seller_item_images
      fetchItemImages(item.id);
    }
  }, [item, open]);

  const fetchItemImages = async (itemId: string) => {
    const { data } = await supabase
      .from('seller_item_images' as any)
      .select('image_url, display_order')
      .eq('item_id', itemId)
      .order('display_order', { ascending: true });
    
    if (data && (data as any[]).length > 0) {
      setImagePreviews((data as any[]).map((img: any) => img.image_url));
    } else if (item?.item_photo_url) {
      setImagePreviews([item.item_photo_url]);
    } else {
      setImagePreviews([]);
    }
  };

  const fetchSubcategories = async () => {
    if (!seller) return;
    try {
      const sellerCategories: string[] = [];
      if (seller.category) sellerCategories.push(seller.category);
      if (seller.categories) {
        seller.categories.split(',').map(c => c.trim()).forEach(cat => {
          if (!sellerCategories.includes(cat)) sellerCategories.push(cat);
        });
      }
      if (sellerCategories.length === 0) { setSubcategories([]); return; }
      const { data, error } = await supabase
        .from('subcategories').select('id, name, category')
        .eq('is_active', true).in('category', sellerCategories)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
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
        toast({ variant: 'destructive', title: 'Not Supported', description: 'Barcode scanner not supported.' });
        stopScanner();
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera' });
      setScanning(false);
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - imagePreviews.length;
    const newFiles = files.slice(0, remaining);
    if (newFiles.length === 0) return;
    
    setImageFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `items/${seller?.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('seller-profiles').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('seller-profiles').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.item_name || !item) {
      toast({ variant: 'destructive', title: 'Required', description: 'Item name is required' });
      return;
    }
    setLoading(true);
    try {
      // Upload any new files and build final image list
      const finalImageUrls: string[] = [];
      let newFileIndex = 0;
      
      for (const preview of imagePreviews) {
        if (preview.startsWith('data:')) {
          // This is a new file that needs uploading
          const file = imageFiles[newFileIndex];
          newFileIndex++;
          if (file) {
            const url = await uploadImage(file);
            if (url) finalImageUrls.push(url);
          }
        } else {
          // Existing URL
          finalImageUrls.push(preview);
        }
      }

      const mainImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : null;

      const { error } = await supabase.from('items').update({
        item_name: form.item_name,
        barcode: form.barcode || null,
        item_photo_url: mainImageUrl,
        purchase_price: parseFloat(form.purchase_price) || 0,
        mrp: parseFloat(form.mrp) || 0,
        seller_price: parseFloat(form.seller_price) || 0,
        franchise_price: parseFloat(form.seller_price) || 0,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        low_stock_alert: parseInt(form.low_stock_alert) || 10,
        gst_percentage: parseFloat(form.gst_percentage) || 0,
        show_in_quick_add: form.show_in_quick_add,
        is_active: form.is_active,
        item_info: form.item_info || null,
        subcategory_id: form.subcategory_id || null
      } as any).eq('id', item.id);

      if (error) throw error;

      // Update seller_item_images: delete old, insert new
      await supabase.from('seller_item_images' as any).delete().eq('item_id', item.id);
      if (finalImageUrls.length > 0) {
        const imageRows = finalImageUrls.map((url, idx) => ({
          item_id: item.id,
          image_url: url,
          display_order: idx
        }));
        await supabase.from('seller_item_images' as any).insert(imageRows);
      }

      toast({ title: 'Success', description: 'Item updated successfully!' });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update item' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { stopScanner(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
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
                <Button size="sm" variant="destructive" className="w-full rounded-none" onClick={stopScanner}>Stop Scanner</Button>
              </div>
            )}
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.subcategory_id} onValueChange={v => setForm(f => ({ ...f, subcategory_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="z-[9999]">
                {subcategories.length === 0 ? (
                  <SelectItem value="none" disabled>No subcategories found</SelectItem>
                ) : (
                  subcategories.map(sc => (
                    <SelectItem key={sc.id} value={sc.id}>{sc.name} ({sc.category})</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Purchase Price</Label>
              <Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
            </div>
            <div>
              <Label>MRP *</Label>
              <Input type="number" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} />
            </div>
            <div>
              <Label>Selling Price *</Label>
              <Input type="number" value={form.seller_price} onChange={e => setForm(f => ({ ...f, seller_price: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Stock Qty</Label>
              <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
            </div>
            <div>
              <Label>Low Stock Alert</Label>
              <Input type="number" value={form.low_stock_alert} onChange={e => setForm(f => ({ ...f, low_stock_alert: e.target.value }))} />
            </div>
            <div>
              <Label>GST %</Label>
              <Input type="number" value={form.gst_percentage} onChange={e => setForm(f => ({ ...f, gst_percentage: e.target.value }))} />
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

          {/* Item Photos (up to 4) */}
          <div>
            <Label>Item Photos (up to 4)</Label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20 rounded border overflow-hidden">
                  <img src={preview} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imagePreviews.length < 4 && (
                <label className="w-20 h-20 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          {/* Item Info */}
          <div>
            <Label>Item Info (Optional)</Label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Add description about this item (e.g., ingredients, serving size, etc.)"
              value={form.item_info}
              onChange={e => setForm(f => ({ ...f, item_info: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { stopScanner(); onOpenChange(false); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemModal;
