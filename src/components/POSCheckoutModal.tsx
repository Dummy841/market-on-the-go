import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Banknote, QrCode, CreditCard, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

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

  const handleCompletePayment = async () => {
    if (!paymentMethod) { toast({ variant: 'destructive', title: 'Select a payment method' }); return; }
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

      const { error } = await supabase.from('orders').insert({
        seller_id: sellerId,
        seller_name: sellerName,
        user_id: userId,
        items: orderItems,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        delivery_address: 'POS - In Store',
        status: 'delivered',
        seller_status: 'accepted',
        delivery_fee: 0,
        platform_fee: 0,
        gst_charges: cart.reduce((s, c) => s + (c.seller_price * c.quantity * c.gst_percentage / 100), 0),
      });

      if (error) throw error;

      // Deduct stock
      for (const c of cart) {
        await supabase.from('items').update({ stock_quantity: Math.max(0, (c as any).stock_quantity - c.quantity) }).eq('id', c.id);
      }

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
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map(pm => (
              <button
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className={`p-3 rounded-lg border-2 text-center transition-all ${pm.color} ${paymentMethod === pm.id ? 'ring-2 ring-primary border-primary' : ''}`}
              >
                <pm.icon className="w-6 h-6 mx-auto mb-1" />
                <div className="text-xs font-semibold">{pm.label}</div>
                <div className="text-[10px] text-muted-foreground">{pm.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleCompletePayment} disabled={processing || !paymentMethod}>
            {processing ? 'Processing...' : `Pay ₹${totalAmount.toFixed(2)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POSCheckoutModal;
