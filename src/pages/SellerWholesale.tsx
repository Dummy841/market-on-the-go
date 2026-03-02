import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, ShoppingCart, Upload, Search, X, Package, FileText, Lock } from 'lucide-react';
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

interface WholesaleOrder {
  id: string;
  items: any[];
  total_amount: number;
  payment_status: string;
  order_status: string;
  delivery_pin: string | null;
  created_at: string;
}

type Step = 'browse' | 'cart' | 'payment' | 'proof' | 'orders';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};

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
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<WholesaleOrder | null>(null);

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

  const fetchOrders = async () => {
    if (!seller) return;
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('wholesale_orders' as any)
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setOrdersLoading(false);
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

  const generatePin = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const handleSubmitOrder = async () => {
    if (!seller || !paymentProof) {
      toast({ variant: 'destructive', title: 'Upload payment proof' });
      return;
    }
    setSubmitting(true);
    try {
      const ext = paymentProof.name.split('.').pop();
      const path = `proofs/${seller.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('wholesale-images').upload(path, paymentProof);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('wholesale-images').getPublicUrl(path);

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
        delivery_pin: generatePin(),
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

  // Orders step
  if (step === 'orders') {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => setStep('browse')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <h2 className="text-xl font-bold mb-4">My Wholesale Orders</h2>

        {ordersLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">#{order.id}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.order_status] || 'bg-muted text-muted-foreground'}`}>
                    {order.order_status.toUpperCase()}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{Array.isArray(order.items) ? order.items.length : 0} products</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold">₹{order.total_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.payment_status === 'verified' ? 'bg-green-100 text-green-800' : order.payment_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-xs">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Tracking Steps */}
                <div className="flex items-center gap-1 pt-2">
                  {['pending', 'verified', 'dispatched', 'delivered'].map((s, i, arr) => {
                    const statusIndex = arr.indexOf(order.order_status);
                    const isActive = i <= statusIndex;
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`h-2 flex-1 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted'}`} />
                        {i < arr.length - 1 && <div className="w-1" />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Pending</span><span>Verified</span><span>Dispatched</span><span>Delivered</span>
                </div>

                {/* Delivery PIN */}
                {order.delivery_pin && order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <Lock className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-orange-700 font-medium">Delivery PIN</p>
                      <p className="text-2xl font-bold tracking-widest text-orange-800">{order.delivery_pin}</p>
                      <p className="text-[10px] text-orange-600">Share this PIN with delivery person for verification</p>
                    </div>
                  </div>
                )}

                {/* Invoice button for delivered orders */}
                {order.order_status === 'delivered' && (
                  <Button variant="outline" className="w-full" onClick={() => setInvoiceOrder(order)}>
                    <FileText className="w-4 h-4 mr-2" /> View Invoice
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Invoice Modal */}
        {invoiceOrder && (
          <Dialog open={!!invoiceOrder} onOpenChange={() => setInvoiceOrder(null)}>
            <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice #{invoiceOrder.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(invoiceOrder.created_at).toLocaleDateString('en-IN')}</span></div>
                <div className="border-t pt-2 space-y-1">
                  {Array.isArray(invoiceOrder.items) && invoiceOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span>₹{item.selling_price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>₹{invoiceOrder.total_amount}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Status</span>
                  <span className="text-green-600 font-medium">Delivered ✓</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep('orders'); fetchOrders(); }}>
              <Package className="w-4 h-4 mr-1" /> My Orders
            </Button>
            {cartCount > 0 && (
              <Button onClick={() => setStep('cart')} className="relative">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart ({cartCount})
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{cartCount}</Badge>
              </Button>
            )}
          </div>
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
                    <p className={`text-[10px] ${product.stock_quantity <= 5 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {product.stock_quantity <= 5 ? 'Out of Stock' : `Stock: ${product.stock_quantity}`}
                    </p>

                    {product.stock_quantity <= 5 ? (
                      <Button size="sm" className="w-full mt-2" disabled>
                        Out of Stock
                      </Button>
                    ) : qty === 0 ? (
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
