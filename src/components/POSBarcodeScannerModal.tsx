import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScannedItem {
  id: string;
  item_name: string;
  barcode: string | null;
  mrp: number;
  seller_price: number;
  gst_percentage: number;
  stock_quantity: number;
  item_photo_url: string | null;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: string;
  onItemsScanned: (items: ScannedItem[]) => void;
}

const POSBarcodeScannerModal = ({ open, onOpenChange, sellerId, onItemsScanned }: Props) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera' });
    }
  }, [toast]);

  const lookupBarcode = useCallback(async (barcode: string) => {
    const now = Date.now();
    if (barcode === lastScannedRef.current && now - lastScannedTimeRef.current < 3000) return;
    lastScannedRef.current = barcode;
    lastScannedTimeRef.current = now;

    const { data } = await supabase
      .from('items')
      .select('id, item_name, barcode, mrp, seller_price, gst_percentage, stock_quantity, item_photo_url')
      .eq('seller_id', sellerId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setScannedItems(prev => {
        const existing = prev.find(i => i.id === data.id);
        if (existing) return prev.map(i => i.id === data.id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { ...data, quantity: 1 }];
      });
      toast({ title: `✅ ${data.item_name}`, description: `₹${data.seller_price}` });
    } else {
      toast({ variant: 'destructive', title: 'Not Found', description: `Barcode "${barcode}" not in your inventory` });
    }
  }, [sellerId, toast]);

  // Barcode detection loop
  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let cancelled = false;

    const detect = async () => {
      if (cancelled || !videoRef.current || !('BarcodeDetector' in window)) return;
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          lookupBarcode(barcodes[0].rawValue);
        }
      } catch { /* ignore */ }
      if (!cancelled) setTimeout(detect, 500);
    };

    detect();
    return () => { cancelled = true; };
  }, [scanning, lookupBarcode]);

  useEffect(() => {
    if (open) startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleAddToCart = () => {
    onItemsScanned(scannedItems);
    setScannedItems([]);
    onOpenChange(false);
  };

  const totalItems = scannedItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = scannedItems.reduce((s, i) => s + i.seller_price * i.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) stopCamera(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <DialogTitle>Multi Scan</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        {/* Camera View */}
        <div className="relative bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {!('BarcodeDetector' in window) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm p-4 text-center">
              BarcodeDetector API not supported in this browser. Use Chrome on Android for best results.
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-32 border-2 border-white/50 rounded-lg" />
          </div>
        </div>

        {/* Scanned Items */}
        {scannedItems.length > 0 && (
          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-sm">Scanned Items ({totalItems})</h3>
            {scannedItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-accent/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.item_name}</div>
                  <div className="text-xs text-muted-foreground">₹{item.seller_price}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setScannedItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setScannedItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-sm font-semibold w-16 text-right">₹{(item.seller_price * item.quantity).toFixed(2)}</div>
              </div>
            ))}

            <div className="flex justify-between font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>

            <Button className="w-full" onClick={handleAddToCart}>
              Add {totalItems} items to Cart
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default POSBarcodeScannerModal;
