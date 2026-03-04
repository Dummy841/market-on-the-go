import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Banknote, QrCode, CreditCard, User, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CartItem {
  id: string;
  item_name: string;
  telugu_name?: string | null;
  barcode: string | null;
  mrp: number;
  seller_price: number;
  gst_percentage: number;
  quantity: number;
}

interface CustomerUser {
  id: string;
  name: string;
  mobile: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalAmount: number;
  cart: CartItem[];
  sellerId: string;
  sellerName: string;
  onPaymentComplete: () => void;
}

const POSCheckoutModal = ({ open, onOpenChange, totalAmount, cart, sellerId, sellerName, onPaymentComplete }: Props) => {
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [paymentStep, setPaymentStep] = useState<'select' | 'upi' | 'card' | 'done'>('select');
  const [cardTransactionId, setCardTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [defaultUpiId, setDefaultUpiId] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string>('');
  const [completedPaymentMethod, setCompletedPaymentMethod] = useState<string>('');
  const [teluguNames, setTeluguNames] = useState<Record<string, string>>({});

  // Preload QR image as soon as modal opens
  const [qrPreloaded, setQrPreloaded] = useState(false);

  // Fetch default UPI ID for this seller
  useEffect(() => {
    if (!open || !sellerId) return;
    const fetchUpi = async () => {
      const { data } = await supabase
        .from('seller_upi_ids')
        .select('upi_id')
        .eq('seller_id', sellerId)
        .eq('is_default', true)
        .maybeSingle();
      setDefaultUpiId((data as any)?.upi_id || null);
    };
    fetchUpi();
    // Fetch Telugu names for cart items
    fetchTeluguNames();
  }, [open, sellerId]);

  // Preload QR code image when we have UPI ID
  useEffect(() => {
    if (defaultUpiId && open) {
      const upiUrl = `upi://pay?pa=${defaultUpiId}&pn=${encodeURIComponent(sellerName)}&am=${totalAmount.toFixed(2)}&cu=INR`;
      const img = new Image();
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
      img.onload = () => setQrPreloaded(true);
    }
  }, [defaultUpiId, open, totalAmount, sellerName]);

  const fetchTeluguNames = async () => {
    const itemIds = cart.map(c => c.id);
    if (itemIds.length === 0) return;
    const { data } = await supabase
      .from('items')
      .select('id, telugu_name')
      .in('id', itemIds);
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach(d => { if (d.telugu_name) map[d.id] = d.telugu_name; });
      setTeluguNames(map);
    }
  };

  const searchCustomers = async (query?: string) => {
    const q = (query ?? customerSearch).trim();
    if (!q) { setCustomers([]); setSearched(false); return; }
    const { data } = await supabase
      .from('users')
      .select('id, name, mobile')
      .or(`mobile.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(10);
    setCustomers(data || []);
    setSearched(true);
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    searchCustomers(value);
  };

  const handleAddCustomer = async () => {
    if (!newName.trim()) { toast({ variant: 'destructive', title: 'Name is required' }); return; }
    const { data, error } = await supabase
      .from('users')
      .insert({ name: newName.trim(), mobile: newPhone.trim() || 'N/A' })
      .select('id, name, mobile')
      .single();
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    if (data) {
      setSelectedCustomer(data);
      setShowAddCustomer(false);
      setNewName('');
      setNewPhone('');
      toast({ title: 'Customer added' });
    }
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'CASH';
    if (method === 'upi') return 'UPI';
    if (method === 'card') return 'CARD';
    return method.toUpperCase();
  };

  const printReceipt = (orderId: string, paymentMethod: string, language: 'english' | 'telugu' = 'english') => {
    const items = cart;
    const subtotal = items.reduce((s, i) => s + (i.seller_price * i.quantity), 0);
    const totalMrp = items.reduce((s, i) => s + (i.mrp * i.quantity), 0);
    const saved = totalMrp - subtotal;
    const gst = items.reduce((s, i) => s + (i.seller_price * i.quantity * i.gst_percentage / 100), 0);

    const customerName = selectedCustomer?.name || 'Walk-in';
    const customerMobile = selectedCustomer?.mobile || '';

    let receiptHtml = `
      <div class="center title">${sellerName}</div>
      <div class="line"></div>
      <div class="row"><span style="color:#d97706">Order #:</span><span>${orderId}</span></div>
      <div class="row"><span style="color:#d97706">Date:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
    `;
    if (customerName !== 'Walk-in') {
      receiptHtml += `<div class="row"><span style="color:#d97706">Customer:</span><span>${customerName}</span></div>`;
      if (customerMobile && customerMobile !== 'N/A') {
        receiptHtml += `<div class="row"><span style="color:#d97706">Phone:</span><span>${customerMobile}</span></div>`;
      }
    }
    receiptHtml += `<div class="line"></div>`;
    items.forEach(item => {
      const displayName = language === 'telugu' && teluguNames[item.id] 
        ? teluguNames[item.id] 
        : item.item_name;
      receiptHtml += `<div style="margin-bottom:6px"><div class="item-name">${displayName}</div>`;
      if (item.mrp > item.seller_price) {
        receiptHtml += `<div class="item-mrp">&nbsp;&nbsp;MRP: ₹${Number(item.mrp).toFixed(2)}</div>`;
      }
      receiptHtml += `<div class="row"><span>&nbsp;&nbsp;₹${Number(item.seller_price).toFixed(2)} × ${item.quantity}</span><span>₹${(item.seller_price * item.quantity).toFixed(2)}</span></div>`;
      if (item.gst_percentage > 0) {
        const itemGst = (item.seller_price * item.quantity * item.gst_percentage / 100);
        receiptHtml += `<div class="row muted"><span>&nbsp;&nbsp;GST (${item.gst_percentage}%)</span><span>₹${itemGst.toFixed(2)}</span></div>`;
      }
      receiptHtml += `</div>`;
    });
    receiptHtml += `
      <div class="line"></div>
      <div class="row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div class="row"><span>GST:</span><span>₹${gst.toFixed(2)}</span></div>
      <div class="line"></div>
      <div class="row bold"><span>TOTAL:</span><span style="font-size:16px">₹${totalAmount.toFixed(2)}</span></div>
    `;
    if (saved > 0) {
      receiptHtml += `<div class="saved-box"><div>🎉 YOU SAVED</div><div class="saved-amount">₹${saved.toFixed(2)}</div></div>`;
    }
    receiptHtml += `
      <div class="center muted" style="margin-top:10px">${getPaymentLabel(paymentMethod)} - COMPLETED</div>
      <div class="line"></div>
      <div class="footer">Thank you for your purchase!<br/>Visit again</div>
    `;

    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; padding-top: calc(20px + env(safe-area-inset-top)); max-width: 350px; margin: 0 auto; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #999; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .title { font-size: 18px; font-weight: bold; }
        .saved-box { border: 2px dashed #333; padding: 12px; margin: 10px 0; text-align: center; }
        .saved-amount { font-size: 22px; font-weight: bold; }
        .item-name { font-weight: bold; }
        .item-mrp { text-decoration: line-through; color: #888; font-size: 11px; }
        .muted { color: #888; font-size: 12px; }
        .footer { color: #d97706; text-align: center; margin-top: 12px; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>
      ${receiptHtml}
      <script>window.print();window.onafterprint=function(){window.close();}<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const handleCompletePayment = async (method: string) => {
    setProcessing(true);
    try {
      const orderItems = cart.map(c => ({
        item_id: c.id,
        item_name: c.item_name,
        barcode: c.barcode,
        quantity: c.quantity,
        seller_price: c.seller_price,
        mrp: c.mrp,
        gst_percentage: c.gst_percentage,
      }));

      const userId = selectedCustomer?.id || '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase.from('orders').insert({
        seller_id: sellerId,
        seller_name: sellerName,
        user_id: userId,
        items: orderItems,
        total_amount: totalAmount,
        payment_method: method,
        delivery_address: 'POS - In Store',
        status: 'delivered',
        seller_status: 'accepted',
        delivery_fee: 0,
        platform_fee: 0,
        gst_charges: cart.reduce((s, c) => s + (c.seller_price * c.quantity * c.gst_percentage / 100), 0),
      }).select('id').single();

      if (error) throw error;

      // Deduct stock
      for (const c of cart) {
        await supabase.from('items').update({ stock_quantity: Math.max(0, (c as any).stock_quantity - c.quantity) }).eq('id', c.id);
      }

      const orderId = data?.id || 'N/A';
      setCompletedOrderId(orderId);
      setCompletedPaymentMethod(method);
      setPaymentStep('done');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintAndClose = (language: 'english' | 'telugu') => {
    printReceipt(completedOrderId, completedPaymentMethod, language);
    onPaymentComplete();
  };

  const handleSkipPrint = () => {
    onPaymentComplete();
  };

  const paymentMethods = [
    { id: 'cash', label: 'Quick Pay', desc: 'Cash', icon: Banknote, color: 'bg-green-500/10 border-green-500/30 hover:border-green-500' },
    { id: 'upi', label: 'UPI Pay', desc: 'QR / UPI', icon: QrCode, color: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500' },
    { id: 'card', label: 'Card Pay', desc: 'Receipt ID', icon: CreditCard, color: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500' },
  ];

  const handlePaymentClick = (methodId: string) => {
    if (methodId === 'cash') {
      handleCompletePayment('cash');
    } else if (methodId === 'upi') {
      setPaymentStep('upi');
    } else if (methodId === 'card') {
      setPaymentStep('card');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStep === 'done' ? '✅ Payment Complete' : 'Complete Payment'}
            <div className="text-2xl font-bold text-primary mt-1">₹{totalAmount.toFixed(2)}</div>
          </DialogTitle>
        </DialogHeader>

        {paymentStep === 'done' ? (
          /* Post-payment: Print buttons */
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Order <span className="font-semibold text-foreground">{completedOrderId}</span> saved successfully!
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => handlePrintAndClose('english')}
              >
                <Printer className="w-6 h-6" />
                <span className="text-xs font-semibold">Print in English</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => handlePrintAndClose('telugu')}
              >
                <Printer className="w-6 h-6" />
                <span className="text-xs font-semibold">Print in Telugu</span>
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkipPrint}>
              Skip Print
            </Button>
          </div>
        ) : (
          <>
            {/* Customer Section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Customer</Label>
              {selectedCustomer ? (
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <User className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">{selectedCustomer.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedCustomer.mobile}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Change</Button>
                </div>
              ) : showAddCustomer ? (
                <div className="space-y-3 p-3 border border-border rounded-lg">
                  <h4 className="font-semibold text-sm">Add New Customer</h4>
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Mobile number" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCustomer} className="flex-1">Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by name or mobile..."
                      value={customerSearch}
                      onChange={e => handleCustomerSearchChange(e.target.value)}
                    />
                    <Button variant="outline" size="icon" onClick={() => searchCustomers()}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  {searched && (
                    customers.length > 0 ? (
                      <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
                        {customers.map(c => (
                          <button key={c.id} className="w-full p-2 text-left hover:bg-accent flex justify-between text-sm border-b last:border-0" onClick={() => { setSelectedCustomer(c); setSearched(false); }}>
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">{c.mobile}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 space-y-2">
                        <p className="text-sm text-muted-foreground">No customers found</p>
                        <Button variant="outline" size="sm" onClick={() => { setShowAddCustomer(true); setNewPhone(/^\d+$/.test(customerSearch.trim()) ? customerSearch.trim() : ''); setSearched(false); }}>
                          <UserPlus className="w-4 h-4 mr-2" /> Add New Customer
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Payment Method</Label>

              {paymentStep === 'select' && (
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => handlePaymentClick(pm.id)}
                      disabled={processing}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${pm.color} ${processing ? 'opacity-50' : ''}`}
                    >
                      <pm.icon className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-xs font-semibold">{pm.label}</div>
                      <div className="text-[10px] text-muted-foreground">{pm.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {paymentStep === 'upi' && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center bg-primary/5">
                    {defaultUpiId ? (
                      <>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${defaultUpiId}&pn=${encodeURIComponent(sellerName)}&am=${totalAmount.toFixed(2)}&cu=INR`)}`}
                          alt="UPI QR Code"
                          className="w-48 h-48 mx-auto mb-3 rounded-lg"
                        />
                        <p className="text-sm font-semibold">Scan QR to Pay</p>
                        <p className="text-2xl font-bold text-primary mt-1">₹{totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">UPI: {defaultUpiId}</p>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-16 h-16 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-semibold">No UPI ID configured</p>
                        <p className="text-xs text-muted-foreground mt-1">Go to POS Settings → Payment Settings to add a UPI ID</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setPaymentStep('select')}>Back</Button>
                    <Button className="flex-1" onClick={() => handleCompletePayment('upi')} disabled={processing}>
                      {processing ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </div>
                </div>
              )}

              {paymentStep === 'card' && (
                <div className="space-y-3">
                  <div className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-purple-500" />
                      <span className="font-semibold text-sm">Card Payment</span>
                    </div>
                    <div>
                      <Label className="text-xs">Transaction ID *</Label>
                      <Input
                        value={cardTransactionId}
                        onChange={e => setCardTransactionId(e.target.value)}
                        placeholder="Enter transaction ID..."
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setPaymentStep('select'); setCardTransactionId(''); }}>Back</Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleCompletePayment('card')}
                      disabled={processing || !cardTransactionId.trim()}
                    >
                      {processing ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel button only in select mode */}
            {paymentStep === 'select' && (
              <div className="pt-2">
                <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Cancel</Button>
              </div>
            )}

            {processing && paymentStep === 'select' && (
              <div className="text-center text-sm text-muted-foreground">Processing cash payment...</div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default POSCheckoutModal;
