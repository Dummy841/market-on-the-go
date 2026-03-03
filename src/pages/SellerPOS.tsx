import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Camera, Plus, Minus, Trash2, ShoppingBag, Keyboard } from 'lucide-react';
import SellerHamburgerMenu from '@/components/SellerHamburgerMenu';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import POSCheckoutModal from '@/components/POSCheckoutModal';
import POSBarcodeScannerModal from '@/components/POSBarcodeScannerModal';
import POSSettingsModal from '@/components/POSSettingsModal';

// No longer used - settings is now a separate page


interface Item {
  id: string;
  item_name: string;
  barcode: string | null;
  mrp: number;
  seller_price: number;
  gst_percentage: number;
  stock_quantity: number;
  item_photo_url: string | null;
}

interface CartItem extends Item {
  quantity: number;
}

const SellerPOS = () => {
  const { seller, loading } = useSellerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [cart, setCartState] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(`pos_cart_${seller?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const setCart = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { sessionStorage.setItem(`pos_cart_${seller?.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [showCheckout, setShowCheckout] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [scannerMode, setScannerMode] = useState<'camera' | 'external' | null>(null);
  const [onlinePendingCount, setOnlinePendingCount] = useState(0);
  
  const [dialogSearchQuery, setDialogSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Item[]>([]);
  const [barcodeDropdownOpen, setBarcodeDropdownOpen] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const barcodeFilteredProducts = allProducts.filter(item => {
    if (!barcodeInput.trim()) return false;
    return item.barcode?.toLowerCase().includes(barcodeInput.toLowerCase());
  });

  useEffect(() => {
    if (!loading && !seller) navigate('/seller-login');
  }, [seller, loading, navigate]);

  const fetchAllProducts = useCallback(async () => {
    if (!seller) return;
    const { data } = await supabase
      .from('items')
      .select('id, item_name, barcode, mrp, seller_price, gst_percentage, stock_quantity, item_photo_url')
      .eq('seller_id', seller.id)
      .eq('is_active', true)
      .order('item_name');
    setAllProducts(data || []);
  }, [seller]);

  useEffect(() => {
    if (seller) fetchAllProducts();
  }, [seller, fetchAllProducts]);

  // Fetch online pending orders count & subscribe to new online orders
  const orderSoundRef = useRef<HTMLAudioElement | null>(null);

  const fetchOnlinePendingCount = useCallback(async () => {
    if (!seller) return;
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_id', seller.id)
      .neq('delivery_address', 'POS - In Store')
      .in('seller_status', ['pending', 'accepted']);
    setOnlinePendingCount(data?.length || 0);
  }, [seller]);

  const playOrderSound = useCallback(() => {
    try {
      const audio = new Audio('/ringtone.mp3');
      orderSoundRef.current = audio;
      audio.play();
      setTimeout(() => { audio.pause(); audio.currentTime = 0; orderSoundRef.current = null; }, 2000);
    } catch (e) { console.error('Sound error:', e); }
  }, []);

  useEffect(() => {
    if (!seller) return;
    fetchOnlinePendingCount();

    const channel = supabase
      .channel('pos-online-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${seller.id}`
      }, payload => {
        const newOrder = payload.new as any;
        if (newOrder.delivery_address === 'POS - In Store') return;
        setOnlinePendingCount(prev => prev + 1);
        playOrderSound();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${seller.id}`
      }, () => {
        fetchOnlinePendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (orderSoundRef.current) { orderSoundRef.current.pause(); orderSoundRef.current = null; }
    };
  }, [seller, fetchOnlinePendingCount, playOrderSound]);

  const filteredProducts = allProducts.filter(item => {
    if (!dialogSearchQuery.trim()) return true;
    const q = dialogSearchQuery.toLowerCase();
    return item.item_name.toLowerCase().includes(q) || (item.barcode && item.barcode.toLowerCase().includes(q));
  });

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

  const addToCart = (item: Item) => {
    playBeep();
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    setShowSearchDialog(false);
    setDialogSearchQuery('');
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller || !barcodeInput.trim()) return;
    const { data } = await supabase
      .from('items')
      .select('id, item_name, barcode, mrp, seller_price, gst_percentage, stock_quantity, item_photo_url')
      .eq('seller_id', seller.id)
      .eq('barcode', barcodeInput.trim())
      .eq('is_active', true)
      .maybeSingle();
    if (data) { addToCart(data); setBarcodeInput(''); setBarcodeDropdownOpen(false); }
    else toast({ variant: 'destructive', title: 'Not Found', description: `No product with barcode "${barcodeInput}"` });
    setBarcodeInput('');
    setBarcodeDropdownOpen(false);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const getDisc = (item: CartItem) => item.mrp > 0 ? ((item.mrp - item.seller_price) / item.mrp * 100) : 0;
  const getTax = (item: CartItem) => (item.seller_price * item.quantity * item.gst_percentage) / 100;
  const getNet = (item: CartItem) => item.seller_price * item.quantity;

  const totals = cart.reduce((acc, item) => ({
    items: acc.items + 1,
    qty: acc.qty + item.quantity,
    disc: acc.disc + ((item.mrp - item.seller_price) * item.quantity),
    tax: acc.tax + getTax(item),
    mrp: acc.mrp + (item.mrp * item.quantity),
    net: acc.net + getNet(item),
  }), { items: 0, qty: 0, disc: 0, tax: 0, mrp: 0, net: 0 });

  const handleScannedItems = (items: CartItem[]) => {
    items.forEach(scannedItem => {
      setCart(prev => {
        const existing = prev.find(c => c.id === scannedItem.id);
        if (existing) return prev.map(c => c.id === scannedItem.id ? { ...c, quantity: c.quantity + scannedItem.quantity } : c);
        return [...prev, scannedItem];
      });
    });
  };

  const handlePaymentComplete = () => {
    setCart([]);
    setShowCheckout(false);
    toast({ title: '✅ Sale Complete', description: 'Payment recorded successfully' });
  };

  if (loading || !seller) return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border p-3 flex items-center gap-3">
        <SellerHamburgerMenu />
        <h1 className="text-lg font-bold flex-1 truncate">POS - {seller.seller_name}</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/seller-dashboard')} className="relative">
          <ShoppingBag className="w-4 h-4 mr-1" /> Dashboard
          {onlinePendingCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
              {onlinePendingCount}
            </span>
          )}
        </Button>
      </header>

      {/* Search & Barcode Bar */}
      <div className="bg-card border-b border-border p-3 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            readOnly
            placeholder="Search product..."
            onClick={() => setShowSearchDialog(true)}
            className="pl-9 cursor-pointer"
          />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={barcodeRef}
                placeholder="Enter barcode..."
                value={barcodeInput}
                onChange={e => { setBarcodeInput(e.target.value); setBarcodeDropdownOpen(true); }}
                onFocus={() => barcodeInput && setBarcodeDropdownOpen(true)}
                className="flex-1"
              />
              {barcodeDropdownOpen && barcodeFilteredProducts.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 bg-card border border-border rounded-b-lg shadow-lg max-h-60 overflow-y-auto">
                  {barcodeFilteredProducts.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full p-3 text-left hover:bg-accent flex justify-between items-center border-b border-border last:border-0"
                      onClick={() => { addToCart(item); setBarcodeInput(''); setBarcodeDropdownOpen(false); }}
                    >
                      <div>
                        <div className="font-medium text-sm">{item.item_name}</div>
                        <div className="text-xs text-muted-foreground">{item.barcode || '-'}</div>
                      </div>
                      <div className="text-sm font-semibold">₹{item.seller_price}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" size="icon" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <Button variant="outline" size="icon" onClick={() => setScannerMode('camera')} title="Camera Scanner">
          <Camera className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScannerMode('external')} title="External Scanner">
          <Keyboard className="w-4 h-4 mr-1" /> External
        </Button>
      </div>

      {/* Cart Table */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-20">
            <Search className="w-12 h-12" />
            <p className="text-lg font-medium">No items in cart</p>
            <p className="text-sm">Search or scan products to add them</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Barcode</TableHead>
                  <TableHead className="text-center w-24 md:w-32">Qty</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Disc%</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Tax</TableHead>
                  <TableHead className="hidden md:table-cell text-right">MRP</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{item.item_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{item.barcode || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-0.5 md:gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6 md:h-7 md:w-7" onClick={() => updateQty(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 md:w-8 text-center font-semibold text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6 md:h-7 md:w-7" onClick={() => updateQty(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">{getDisc(item).toFixed(1)}%</TableCell>
                    <TableCell className="hidden md:table-cell text-right">₹{getTax(item).toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">₹{(item.mrp * item.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">₹{getNet(item).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Bottom Summary */}
      {cart.length > 0 && (
        <div className="bg-card border-t border-border p-3">
          <div className="flex flex-wrap gap-4 text-sm mb-3 justify-between">
            <div><span className="text-muted-foreground">Items:</span> <span className="font-semibold">{totals.items}</span></div>
            <div><span className="text-muted-foreground">Qty:</span> <span className="font-semibold">{totals.qty}</span></div>
            <div><span className="text-muted-foreground">Disc:</span> <span className="font-semibold">₹{totals.disc.toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">Tax:</span> <span className="font-semibold">₹{totals.tax.toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">MRP:</span> <span className="font-semibold">₹{totals.mrp.toFixed(2)}</span></div>
            <div className="text-base"><span className="text-muted-foreground">Net:</span> <span className="font-bold text-primary">₹{totals.net.toFixed(2)}</span></div>
          </div>
          <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
            Proceed to Checkout — ₹{totals.net.toFixed(2)}
          </Button>
        </div>
      )}

      {showCheckout && (
        <POSCheckoutModal
          open={showCheckout}
          onOpenChange={setShowCheckout}
          totalAmount={totals.net}
          cart={cart}
          sellerId={seller.id}
          sellerName={seller.seller_name}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {scannerMode === 'camera' && (
        <POSBarcodeScannerModal
          open={true}
          onOpenChange={() => setScannerMode(null)}
          sellerId={seller.id}
          onItemsScanned={handleScannedItems}
          mode="camera"
        />
      )}

      {scannerMode === 'external' && (
        <POSBarcodeScannerModal
          open={true}
          onOpenChange={() => setScannerMode(null)}
          sellerId={seller.id}
          onItemsScanned={handleScannedItems}
          mode="external"
        />
      )}


      {/* Search Products Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Search Products</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or barcode..."
              value={dialogSearchQuery}
              onChange={e => setDialogSearchQuery(e.target.value)}
              className="pl-9 border-2 border-primary"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No products found</p>
            ) : (
              filteredProducts.map(item => (
                <button
                  key={item.id}
                  className="w-full py-3 text-left hover:bg-accent flex justify-between items-center border-b border-border last:border-0"
                  onClick={() => addToCart(item)}
                >
                  <div>
                    <div className="font-semibold text-sm">{item.item_name}</div>
                    <div className="text-xs text-muted-foreground">{item.barcode || '-'} • Stock: {item.stock_quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">₹{Number(item.seller_price).toFixed(2)}</div>
                    {item.mrp > item.seller_price && (
                      <div className="text-xs text-muted-foreground line-through">₹{Number(item.mrp).toFixed(2)}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SellerPOS;
