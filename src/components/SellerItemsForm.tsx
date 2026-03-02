import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, ScanBarcode, Keyboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';

interface Subcategory {
  id: string;
  name: string;
  category: string;
}

interface SellerItemsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SellerItemsForm = ({ open, onOpenChange, onSuccess }: SellerItemsFormProps) => {
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
  const [manualBarcodeEntry, setManualBarcodeEntry] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const { toast } = useToast();
  const { seller } = useSellerAuth();

  useEffect(() => {
    if (open && seller) {
      fetchSubcategories();
      generateBarcode();
    }
  }, [open, seller]);

  const generateBarcode = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_seller_item_barcode' as any);
      if (!error && data) {
        setForm(f => ({ ...f, barcode: data as string }));
      }
    } catch (err) {
      console.error('Error generating barcode:', err);
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
        .from('subcategories')
        .select('id, name, category')
        .eq('is_active', true)
        .in('category', sellerCategories)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  // Look up existing product by barcode and prefill form
  const lookupExistingProduct = async (barcode: string) => {
    if (!seller) return;
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setForm(f => ({
        ...f,
        barcode: barcode,
        item_name: data.item_name || '',
        purchase_price: String(data.purchase_price || 0),
        mrp: String(data.mrp || 0),
        seller_price: String(data.seller_price || 0),
        stock_quantity: String(data.stock_quantity || 0),
        low_stock_alert: String(data.low_stock_alert || 10),
        gst_percentage: String(data.gst_percentage || 0),
        show_in_quick_add: data.show_in_quick_add || false,
        is_active: data.is_active ?? true,
        item_info: data.item_info || '',
        subcategory_id: data.subcategory_id || ''
      }));
      if (data.item_photo_url) {
        setImagePreviews([data.item_photo_url]);
      }
      toast({ title: '📦 Product Found', description: `"${data.item_name}" details loaded from existing inventory` });
      return true;
    }
    return false;
  };

  const startScanner = async () => {
    setScanning(true);
    scanningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        await videoRef.current.play(); 
      }
      
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ 
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] 
        });
        const detect = async () => {
          if (!videoRef.current || !scanningRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const scannedBarcode = barcodes[0].rawValue;
              setForm(f => ({ ...f, barcode: scannedBarcode }));
              stopScanner();
              toast({ title: '✅ Barcode Scanned', description: `Barcode: ${scannedBarcode}` });
              // Check if product already exists
              await lookupExistingProduct(scannedBarcode);
              return;
            }
          } catch (e) { /* continue */ }
          if (scanningRef.current) setTimeout(detect, 300);
        };
        detect();
      } else {
        // No BarcodeDetector - show manual entry option
        toast({ 
          title: 'Scanner Not Available', 
          description: 'Camera is on but auto-detection not supported. Enter barcode manually below.' 
        });
        setManualBarcodeEntry(true);
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Please check permissions.' });
      setScanning(false);
      scanningRef.current = false;
    }
  };

  const stopScanner = () => {
    setScanning(false);
    scanningRef.current = false;
    setManualBarcodeEntry(false);
    if (streamRef.current) { 
      streamRef.current.getTracks().forEach(t => t.stop()); 
      streamRef.current = null; 
    }
  };

  const handleManualBarcodeSubmit = async () => {
    if (form.barcode.trim()) {
      stopScanner();
      toast({ title: '✅ Barcode Set', description: `Barcode: ${form.barcode}` });
      await lookupExistingProduct(form.barcode.trim());
    }
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
    if (!form.item_name) {
      toast({ variant: 'destructive', title: 'Required', description: 'Item name is required' });
      return;
    }
    if (!seller) return;
    setLoading(true);
    try {
      // Upload first image as main item_photo_url
      let mainImageUrl = null;
      if (imageFiles.length > 0) {
        mainImageUrl = await uploadImage(imageFiles[0]);
        if (!mainImageUrl) throw new Error('Failed to upload image');
      }

      const { data: insertedItem, error } = await supabase.from('items').insert({
        seller_id: seller.id,
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
      } as any).select('id').single();

      if (error) throw error;

      // Upload additional images to seller_item_images table
      if (insertedItem && imageFiles.length > 0) {
        const imageUploads = await Promise.all(
          imageFiles.map(async (file, index) => {
            const url = index === 0 ? mainImageUrl : await uploadImage(file);
            return url ? { item_id: insertedItem.id, image_url: url, display_order: index } : null;
          })
        );
        const validUploads = imageUploads.filter(Boolean);
        if (validUploads.length > 0) {
          await supabase.from('seller_item_images' as any).insert(validUploads);
        }
      }

      toast({ title: 'Success', description: 'Item added successfully!' });

      setForm({
        item_name: '', barcode: '', purchase_price: '0', mrp: '0', seller_price: '0',
        stock_quantity: '0', low_stock_alert: '10', gst_percentage: '0',
        show_in_quick_add: false, is_active: true, item_info: '', subcategory_id: ''
      });
      setImageFiles([]);
      setImagePreviews([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to add item' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { stopScanner(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Item Name *</Label>
            <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
          </div>

          <div>
            <Label>Barcode</Label>
            <div className="flex gap-2">
              <Input 
                value={form.barcode} 
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} 
                className="font-mono" 
                placeholder="Scan or enter barcode"
              />
              <Button type="button" variant="outline" size="icon" onClick={scanning ? stopScanner : startScanner}>
                <ScanBarcode className="w-4 h-4" />
              </Button>
            </div>
            {scanning && (
              <div className="mt-2 rounded-lg overflow-hidden border">
                <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
                {manualBarcodeEntry && (
                  <div className="p-2 bg-muted flex gap-2">
                    <Input 
                      placeholder="Type barcode manually..." 
                      value={form.barcode}
                      onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                      className="font-mono"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleManualBarcodeSubmit()}
                    />
                    <Button size="sm" onClick={handleManualBarcodeSubmit}>
                      <Keyboard className="w-4 h-4 mr-1" /> Set
                    </Button>
                  </div>
                )}
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
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
            <Button variant="outline" onClick={() => { stopScanner(); onOpenChange(false); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerItemsForm;
