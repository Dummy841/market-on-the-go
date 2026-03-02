import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Banknote, QrCode, CreditCard, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CartItem {
  id: string;
  item_name: string;
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
  const [paymentStep, setPaymentStep] = useState<'select' | 'upi' | 'card'>('select');
  const [cardTransactionId, setCardTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const searchCustomers = async () => {
    if (!customerSearch.trim()) return;
    const query = customerSearch.trim();
    const { data } = await supabase
      .from('users')
      .select('id, name, mobile')
      .or(`mobile.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10);
    setCustomers(data || []);
    setSearched(true);
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

  const printReceipt = (orderId: string, paymentMethod: string) => {
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
      receiptHtml += `<div style="margin-bottom:6px"><div class="item-name">${item.item_name}</div>`;
      if (item.mrp > item.seller_price) {
        receiptHtml += `<div class="item-mrp">&nbsp;&nbsp;MRP: ₹${Number(item.mrp).toFixed(2)}</div>`;
      }
      receiptHtml += `<div class="row"><span>&nbsp;&nbsp;₹${Number(item.seller_price).toFixed(2)} × ${item.quantity}</span><span>₹${(item.seller_price * item.quantity).toFixed(2)}</span></div></div>`;
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
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; max-width: 350px; margin: 0 auto; color: #000; }
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

      // Auto-print receipt
      const orderId = data?.id || 'N/A';
      printReceipt(orderId, method);

      onPaymentComplete();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Quick Pay', desc: 'Cash', icon: Banknote, color: 'bg-green-500/10 border-green-500/30 hover:border-green-500' },
    { id: 'upi', label: 'UPI Pay', desc: 'QR / UPI', icon: QrCode, color: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500' },
    { id: 'card', label: 'Card Pay', desc: 'Receipt ID', icon: CreditCard, color: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500' },
  ];

  const handlePaymentClick = (methodId: string) => {
    if (methodId === 'cash') {
      // Immediately complete as cash
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
            Complete Payment
            <div className="text-2xl font-bold text-primary mt-1">₹{totalAmount.toFixed(2)}</div>
          </DialogTitle>
        </DialogHeader>

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
                  onChange={e => setCustomerSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchCustomers()}
                />
                <Button variant="outline" size="icon" onClick={searchCustomers}>
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
                    <Button variant="outline" size="sm" onClick={() => { setShowAddCustomer(true); setSearched(false); }}>
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
              <div className="border-2 border-dashed border-blue-400 rounded-lg p-6 text-center bg-blue-500/5">
                <QrCode className="w-16 h-16 mx-auto mb-2 text-blue-500" />
                <p className="text-sm font-semibold">Scan QR to Pay</p>
                <p className="text-2xl font-bold text-primary mt-1">₹{totalAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-2">Show this QR to the customer</p>
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
      </DialogContent>
    </Dialog>
  );
};

export default POSCheckoutModal;
