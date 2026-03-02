import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Camera, Plus, Minus, Trash2 } from 'lucide-react';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import POSCheckoutModal from '@/components/POSCheckoutModal';
import POSBarcodeScannerModal from '@/components/POSBarcodeScannerModal';

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !seller) navigate('/seller-login');
  }, [seller, loading, navigate]);

  const searchProducts = useCallback(async (query: string) => {
    if (!seller || !query.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
    const { data } = await supabase
      .from('items')
      .select('id, item_name, barcode, mrp, seller_price, gst_percentage, stock_quantity, item_photo_url')
      .eq('seller_id', seller.id)
      .eq('is_active', true)
      .ilike('item_name', `%${query}%`)
      .limit(20);
    setSearchResults(data || []);
    setShowSearchResults(true);
  }, [seller]);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchProducts]);

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    setShowSearchResults(false);
    setSearchQuery('');
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
    if (data) { addToCart(data); setBarcodeInput(''); }
    else toast({ variant: 'destructive', title: 'Not Found', description: `No product with barcode "${barcodeInput}"` });
    setBarcodeInput('');
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/seller-dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">POS - {seller.seller_name}</h1>
      </header>

      {/* Search & Barcode Bar */}
      <div className="bg-card border-b border-border p-3 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="pl-9"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 bg-card border border-border rounded-b-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  className="w-full p-3 text-left hover:bg-accent flex justify-between items-center border-b border-border last:border-0"
                  onClick={() => addToCart(item)}
                >
                  <div>
                    <div className="font-medium text-sm">{item.item_name}</div>
                    <div className="text-xs text-muted-foreground">{item.barcode || 'No barcode'}</div>
                  </div>
                  <div className="text-sm font-semibold">₹{item.seller_price}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleBarcodeSubmit} className="flex gap-2 min-w-[200px] flex-1">
          <Input
            ref={barcodeRef}
            placeholder="Enter barcode..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
          <Camera className="w-5 h-5" />
        </Button>
      </div>

      {/* Cart Table */}
      <div className="flex-1 overflow-auto p-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-20">
            <Search className="w-12 h-12" />
            <p className="text-lg font-medium">No items in cart</p>
            <p className="text-sm">Search or scan products to add them</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-center w-32">Qty</TableHead>
                  <TableHead className="text-right">Disc%</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">{item.item_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.barcode || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{getDisc(item).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">₹{getTax(item).toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{(item.mrp * item.quantity).toFixed(2)}</TableCell>
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

      {showScanner && (
        <POSBarcodeScannerModal
          open={showScanner}
          onOpenChange={setShowScanner}
          sellerId={seller.id}
          onItemsScanned={handleScannedItems}
        />
      )}
    </div>
  );
};

export default SellerPOS;
