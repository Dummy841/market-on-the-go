import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, ScanBarcode, Camera, X, Package } from 'lucide-react';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  seller_price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: {
    id: string;
    items: OrderItem[];
    seller_name: string;
  } | null;
  onConfirmed: () => void;
}

const FRUITS_VEG_KEYWORDS = ['fruits', 'vegetables', 'fruit', 'vegetable', 'veggies', 'vegitables', 'vegitable'];

const ProductConfirmationModal = ({ open, onOpenChange, order, onConfirmed }: Props) => {
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());
  const [scanningItemId, setScanningItemId] = useState<string | null>(null);
  const [photoItemId, setPhotoItemId] = useState<string | null>(null);
  const [itemBarcodes, setItemBarcodes] = useState<Record<string, string | null>>({});
  const [fruitsVegItemIds, setFruitsVegItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const hasBarcodeDetector = 'BarcodeDetector' in window;

  // Fetch item barcodes and subcategory info
  useEffect(() => {
    if (!open || !order) return;
    setConfirmedItems(new Set());
    setScanningItemId(null);
    setPhotoItemId(null);
    setLoading(true);

    const fetchItemInfo = async () => {
      const itemIds = order.items.map(i => i.id);
      
      const { data: items } = await supabase
        .from('items')
        .select('id, barcode, subcategory_id')
        .in('id', itemIds);

      if (!items) { setLoading(false); return; }

      const barcodes: Record<string, string | null> = {};
      const subcatIds = new Set<string>();
      items.forEach(item => {
        barcodes[item.id] = item.barcode || null;
        if (item.subcategory_id) subcatIds.add(item.subcategory_id);
      });
      setItemBarcodes(barcodes);

      // Check which subcategories are fruits/vegetables
      if (subcatIds.size > 0) {
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('id, name, category')
          .in('id', Array.from(subcatIds));

        const fvSubcatIds = new Set(
          (subcats || [])
            .filter(sc => FRUITS_VEG_KEYWORDS.some(kw => 
              sc.name.toLowerCase().includes(kw) || sc.category.toLowerCase().includes(kw)
            ))
            .map(sc => sc.id)
        );

        const fvItemIds = new Set(
          items.filter(i => i.subcategory_id && fvSubcatIds.has(i.subcategory_id)).map(i => i.id)
        );
        setFruitsVegItemIds(fvItemIds);
      } else {
        setFruitsVegItemIds(new Set());
      }

      setLoading(false);
    };

    fetchItemInfo();
  }, [open, order]);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* ignore */ }
  }, []);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (forPhoto = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!forPhoto) scanningRef.current = true;
    } catch {
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera.' });
      setScanningItemId(null);
      setPhotoItemId(null);
    }
  }, []);

  // Barcode detection loop
  useEffect(() => {
    if (!scanningItemId || !videoRef.current || !hasBarcodeDetector) return;
    let cancelled = false;

    const detect = async () => {
      if (cancelled || !videoRef.current || !scanningRef.current) return;
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
        });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const scanned = barcodes[0].rawValue;
          const expected = itemBarcodes[scanningItemId];
          if (expected && scanned === expected) {
            playBeep();
            setConfirmedItems(prev => new Set(prev).add(scanningItemId));
            toast({ title: '✅ Product Matched!' });
            stopCamera();
            setScanningItemId(null);
            return;
          } else {
            toast({ variant: 'destructive', title: 'Product Not Matched', description: `Scanned: ${scanned}` });
          }
        }
      } catch { /* ignore */ }
      if (!cancelled && scanningRef.current) setTimeout(detect, 400);
    };

    startCamera().then(() => detect());
    return () => { cancelled = true; stopCamera(); };
  }, [scanningItemId, itemBarcodes, playBeep, startCamera, stopCamera, hasBarcodeDetector]);

  // Photo camera
  useEffect(() => {
    if (!photoItemId) return;
    startCamera(true);
    return () => stopCamera();
  }, [photoItemId, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!photoItemId) return;
    // Just confirm the item when photo is taken
    playBeep();
    setConfirmedItems(prev => new Set(prev).add(photoItemId));
    toast({ title: '✅ Photo Confirmed!' });
    stopCamera();
    setPhotoItemId(null);
  };

  const handleClose = () => {
    stopCamera();
    setScanningItemId(null);
    setPhotoItemId(null);
    onOpenChange(false);
  };

  if (!order || !open) return null;

  const allConfirmed = order.items.every(item => confirmedItems.has(item.id));
  const isCameraActive = !!scanningItemId || !!photoItemId;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-3 flex items-center justify-between shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Confirm Products - #{order.id.slice(-4)}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading items...</div>
      ) : isCameraActive ? (
        <>
          {/* Full-screen Camera View */}
          <div className="relative bg-black flex-1 min-h-0">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {scanningItemId && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-white/50 rounded-lg" />
              </div>
            )}
            {photoItemId && (
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 60% 60% at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
              }} />
            )}
            {/* Scanning item label */}
            <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                {scanningItemId
                  ? `Scanning: ${order.items.find(i => i.id === scanningItemId)?.item_name || ''}`
                  : `Photo: ${order.items.find(i => i.id === photoItemId)?.item_name || ''}`}
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="bg-card border-t border-border p-4 shrink-0 space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              {scanningItemId
                ? 'Point camera at the product barcode'
                : 'Take a photo of the product to confirm'}
            </p>
            <div className="flex gap-2">
              {photoItemId && (
                <Button className="flex-1" onClick={capturePhoto}>
                  <Camera className="w-4 h-4 mr-1" /> Capture & Confirm
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={() => {
                stopCamera();
                setScanningItemId(null);
                setPhotoItemId(null);
              }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Items Checklist - scrollable */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan each product barcode to verify before packing.
          </p>

          {order.items.map(item => {
            const isConfirmed = confirmedItems.has(item.id);
            const isFruitsVeg = fruitsVegItemIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isConfirmed ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-card border-border'
                }`}
              >
                <div className="shrink-0">
                  {isConfirmed ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.item_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Qty: {item.quantity} · ₹{item.seller_price * item.quantity}
                  </div>
                </div>

                {!isConfirmed && (
                  isFruitsVeg ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPhotoItemId(item.id)}
                      className="shrink-0"
                    >
                      <Camera className="w-4 h-4 mr-1" /> Photo
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setScanningItemId(item.id)}
                      className="shrink-0"
                    >
                      <ScanBarcode className="w-4 h-4 mr-1" /> Scan
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fixed bottom button - only show when not in camera mode */}
      {!isCameraActive && !loading && (
        <div className="bg-card border-t border-border p-4 shrink-0">
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={!allConfirmed}
            onClick={onConfirmed}
          >
            <Package className="w-4 h-4 mr-1" />
            {allConfirmed ? 'Mark as Packed' : `Confirm all items (${confirmedItems.size}/${order.items.length})`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductConfirmationModal;
