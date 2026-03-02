import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Minus, Keyboard, Camera, Usb } from 'lucide-react';
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
  mode?: 'camera' | 'external';
}

const POSBarcodeScannerModal = ({ open, onOpenChange, sellerId, onItemsScanned, mode = 'camera' }: Props) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [hasBarcodeDetector] = useState(() => 'BarcodeDetector' in window);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const scanningRef = useRef(false);
  const externalInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  // Play a short beep sound using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch { /* ignore */ }
  }, []);

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
      playBeep();
      setScannedItems(prev => {
        const existing = prev.find(i => i.id === data.id);
        if (existing) return prev.map(i => i.id === data.id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { ...data, quantity: 1 }];
      });
      toast({ title: `✅ ${data.item_name}`, description: `₹${data.seller_price}` });
    } else {
      toast({ variant: 'destructive', title: 'Not Found', description: `Barcode "${barcode}" not in your inventory` });
    }
  }, [sellerId, toast, playBeep]);

  const startCamera = useCallback(async () => {
    if (mode !== 'camera') return;
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
      scanningRef.current = true;
    } catch (err) {
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Check permissions.' });
    }
  }, [toast, mode]);

  // Barcode detection loop for camera mode
  useEffect(() => {
    if (mode !== 'camera' || !scanning || !videoRef.current || !hasBarcodeDetector) return;
    let cancelled = false;

    const detect = async () => {
      if (cancelled || !videoRef.current || !scanningRef.current) return;
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          lookupBarcode(barcodes[0].rawValue);
        }
      } catch { /* ignore */ }
      if (!cancelled && scanningRef.current) setTimeout(detect, 400);
    };

    detect();
    return () => { cancelled = true; };
  }, [scanning, lookupBarcode, hasBarcodeDetector, mode]);

  useEffect(() => {
    if (open && mode === 'camera') startCamera();
    if (open && mode === 'external') {
      // Focus the external input for USB/Bluetooth scanner
      setTimeout(() => externalInputRef.current?.focus(), 300);
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera, mode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  // External scanner: barcodes come as rapid keystrokes ending with Enter
  const handleExternalScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.target as HTMLInputElement).value.trim();
      if (val) {
        lookupBarcode(val);
        setManualBarcode('');
      }
    }
  };

  const handleAddToCart = () => {
    onItemsScanned(scannedItems);
    setScannedItems([]);
    onOpenChange(false);
  };

  const totalItems = scannedItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = scannedItems.reduce((s, i) => s + i.seller_price * i.quantity, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {mode === 'camera' ? <Camera className="w-5 h-5 text-primary" /> : <Usb className="w-5 h-5 text-primary" />}
          <h1 className="text-lg font-bold">{mode === 'camera' ? 'Camera Scanner' : 'External Scanner'}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onOpenChange(false); }}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      {mode === 'camera' ? (
        <>
          {/* Camera View */}
          <div className="relative bg-black flex-1 min-h-0">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border-2 border-white/50 rounded-lg" />
            </div>
            {!hasBarcodeDetector && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 text-center">
                Auto-scan not supported. Use manual entry below.
              </div>
            )}
          </div>

          {/* Manual Barcode Entry */}
          <div className="bg-card border-t border-border p-3 shrink-0">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Enter barcode manually..."
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                className="font-mono flex-1"
                autoFocus={!hasBarcodeDetector}
              />
              <Button type="submit" size="sm">
                <Keyboard className="w-4 h-4 mr-1" /> Add
              </Button>
            </form>
          </div>
        </>
      ) : (
        /* External Scanner Mode */
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center space-y-3">
            <Usb className="w-16 h-16 mx-auto text-primary opacity-70" />
            <h2 className="text-xl font-bold">External Scanner Ready</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect your USB or Bluetooth barcode scanner. Scan a barcode and it will be automatically detected.
            </p>
          </div>

          <div className="w-full max-w-md">
            <Input
              ref={externalInputRef}
              placeholder="Scanner input will appear here..."
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={handleExternalScannerInput}
              className="font-mono text-center text-lg h-14 border-2 border-primary"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Keep this field focused. Scanner sends barcodes as keystrokes + Enter.
            </p>
          </div>
        </div>
      )}

      {/* Scanned Items */}
      {scannedItems.length > 0 && (
        <div className="bg-card border-t border-border p-4 space-y-2 max-h-[40vh] overflow-y-auto shrink-0">
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
    </div>
  );
};

export default POSBarcodeScannerModal;
