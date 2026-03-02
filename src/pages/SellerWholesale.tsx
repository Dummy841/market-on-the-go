import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, ShoppingCart, Upload, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { useToast } from '@/hooks/use-toast';

interface WholesaleProduct {
  id: string;
  product_name: string;
  barcode: string;
  category: string | null;
  mrp: number;
  selling_price: number;
  stock_quantity: number;
  is_active: boolean;
  images?: string[];
}

interface CartItem extends WholesaleProduct {
  quantity: number;
}

type Step = 'browse' | 'cart' | 'payment' | 'proof';

const SellerWholesale = () => {
  const { seller } = useSellerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<Step>('browse');
  const [loading, setLoading] = useState(true);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [upiTxnId, setUpiTxnId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!seller) { navigate('/seller-login'); return; }
    fetchProducts();
  }, [seller]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wholesale_products' as any)
        .select('*')
        .eq('is_active', true)
        .order('product_name');
      if (error) throw error;

      // Fetch images for all products
      const productIds = (data as any[]).map(p => p.id);
      const { data: imgData } = await supabase
        .from('wholesale_product_images' as any)
        .select('product_id, image_url')
        .in('product_id', productIds)
        .order('display_order');

      const imageMap: Record<string, string[]> = {};
      (imgData as any[] || []).forEach(img => {
        if (!imageMap[img.product_id]) imageMap[img.product_id] = [];
        imageMap[img.product_id].push(img.image_url);
      });

      setProducts((data as any[]).map(p => ({ ...p, images: imageMap[p.id] || [] })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: WholesaleProduct) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) return prev.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.selling_price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const getCartQty = (id: string) => cart.find(c => c.id === id)?.quantity || 0;

  const handleUPIPayment = () => {
    const upiUrl = `upi://pay?pa=2755c@ybl&pn=Zippy%20Wholesale&am=${cartTotal}&cu=INR`;
    window.open(upiUrl, '_blank');
    setStep('proof');
  };

  const handleSubmitOrder = async () => {
    if (!seller || !paymentProof) {
      toast({ variant: 'destructive', title: 'Upload payment proof' });
      return;
    }
    setSubmitting(true);
    try {
      // Upload proof
      const ext = paymentProof.name.split('.').pop();
      const path = `proofs/${seller.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('wholesale-images').upload(path, paymentProof);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('wholesale-images').getPublicUrl(path);

      // Create order
      const { error } = await supabase.from('wholesale_orders' as any).insert({
        seller_id: seller.id,
        seller_name: seller.seller_name,
        items: cart.map(c => ({
          product_id: c.id,
          product_name: c.product_name,
          barcode: c.barcode,
          selling_price: c.selling_price,
          mrp: c.mrp,
          quantity: c.quantity,
        })),
        total_amount: cartTotal,
        delivery_address: `${seller.seller_name}`,
        delivery_latitude: seller.seller_latitude,
        delivery_longitude: seller.seller_longitude,
        upi_transaction_id: upiTxnId || null,
        payment_proof_url: urlData.publicUrl,
        payment_status: 'pending',
        order_status: 'pending',
      } as any);

      if (error) throw error;
      toast({ title: 'Order Placed!', description: 'Your wholesale order has been submitted for verification.' });
      setCart([]);
      setStep('browse');
      setPaymentProof(null);
      setUpiTxnId('');
    } catch (error: any) {
      console.error('Order error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  if (!seller) return null;

  // Payment proof step
  if (step === 'proof') {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => setStep('payment')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <h2 className="text-xl font-bold mb-4">Upload Payment Proof</h2>
        <p className="text-sm text-muted-foreground mb-4">After completing UPI payment of ₹{cartTotal}, upload the screenshot below.</p>

        <div className="space-y-4">
          <div>
            <Label>UPI Transaction ID (optional)</Label>
            <Input value={upiTxnId} onChange={e => setUpiTxnId(e.target.value)} placeholder="Enter UPI transaction ID" />
          </div>

          <div>
            <Label>Payment Screenshot *</Label>
            {paymentProof ? (
              <div className="relative mt-2">
                <img src={URL.createObjectURL(paymentProof)} className="w-full max-h-64 object-contain rounded-lg border" />
                <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={() => setPaymentProof(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <label className="mt-2 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Tap to upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setPaymentProof(e.target.files[0])} />
              </label>
            )}
          </div>

          <Button className="w-full" onClick={handleSubmitOrder} disabled={submitting || !paymentProof}>
            {submitting ? 'Submitting...' : 'Submit Order'}
          </Button>
        </div>
      </div>
    );
  }

  // Payment step
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => setStep('cart')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <h2 className="text-xl font-bold mb-4">Payment</h2>

        <Card className="p-4 space-y-3">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Total Amount</p>
            <p className="text-3xl font-bold">₹{cartTotal}</p>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Pay to UPI: <span className="font-mono font-bold">2755c@ybl</span></p>
          </div>

          <Button className="w-full" size="lg" onClick={handleUPIPayment}>
            Pay ₹{cartTotal} via UPI
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            After payment, you'll need to upload a screenshot as proof.
          </p>
        </Card>
      </div>
    );
  }

  // Cart step
  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => setStep('browse')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <h2 className="text-xl font-bold mb-4">Cart ({cartCount} items)</h2>

        {cart.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Cart is empty</p>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <Card key={item.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">₹{item.selling_price} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                  <span className="font-bold text-sm ml-2">₹{item.selling_price * item.quantity}</span>
                </div>
              </Card>
            ))}

            <Card className="p-3">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{cartTotal}</span>
              </div>
            </Card>

            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Delivery Address</p>
              <p className="text-sm font-medium">{seller.seller_name}</p>
              {seller.seller_latitude && <p className="text-xs text-muted-foreground">Location: {seller.seller_latitude}, {seller.seller_longitude}</p>}
            </Card>

            <Button className="w-full" size="lg" onClick={() => setStep('payment')}>
              Proceed to Payment (₹{cartTotal})
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Browse step
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/seller-dashboard')}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-lg font-bold">Wholesale Shop</h1>
          </div>
          {cartCount > 0 && (
            <Button onClick={() => setStep('cart')} className="relative">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart ({cartCount})
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{cartCount}</Badge>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading products...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(product => {
              const qty = getCartQty(product.id);
              return (
                <Card key={product.id} className="overflow-hidden">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                  )}
                  <div className="p-2">
                    <p className="font-medium text-sm truncate">{product.product_name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-sm">₹{product.selling_price}</span>
                      {product.mrp > product.selling_price && (
                        <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Stock: {product.stock_quantity}</p>

                    {qty === 0 ? (
                      <Button size="sm" className="w-full mt-2" onClick={() => addToCart(product)}>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(product.id, -1)}><Minus className="w-3 h-3" /></Button>
                        <span className="font-bold text-sm">{qty}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(product.id, 1)}><Plus className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && step === 'browse' && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <span className="font-bold">{cartCount} items</span>
              <span className="text-muted-foreground ml-2">₹{cartTotal}</span>
            </div>
            <Button onClick={() => setStep('cart')}>View Cart</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerWholesale;
