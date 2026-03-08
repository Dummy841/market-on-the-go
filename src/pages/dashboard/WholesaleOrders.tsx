import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, CheckCircle, XCircle, Truck, PackageCheck, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { PinVerificationModal } from '@/components/PinVerificationModal';

interface WholesaleOrder {
  id: string;
  seller_id: string;
  seller_name: string;
  items: any[];
  total_amount: number;
  delivery_address: string | null;
  upi_transaction_id: string | null;
  payment_proof_url: string | null;
  payment_status: string;
  order_status: string;
  admin_notes: string | null;
  delivery_pin: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'secondary',
  verified: 'default',
  rejected: 'destructive',
  dispatched: 'default',
  delivered: 'default',
  cancelled: 'destructive',
};

const WholesaleOrders = () => {
  const { hasPermission } = useAdminAuth();
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState<WholesaleOrder | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [pinOrder, setPinOrder] = useState<WholesaleOrder | null>(null);
  const [rejectOrder, setRejectOrder] = useState<WholesaleOrder | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const { toast } = useToast();

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('wholesale_orders' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const deductStock = async (order: WholesaleOrder) => {
    try {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const { data: product } = await supabase
          .from('wholesale_products' as any)
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();
        if (product) {
          const newQty = Math.max(0, (product as any).stock_quantity - item.quantity);
          await supabase
            .from('wholesale_products' as any)
            .update({ stock_quantity: newQty } as any)
            .eq('id', item.product_id);
        }
      }
    } catch (error) {
      console.error('Stock deduction error:', error);
    }
  };

  const updateOrder = async (orderId: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('wholesale_orders' as any)
        .update(updates as any)
        .eq('id', orderId);
      if (error) throw error;

      // Deduct stock when payment is verified
      if (updates.payment_status === 'verified') {
        const order = orders.find(o => o.id === orderId);
        if (order) await deductStock(order);
      }

      toast({ title: 'Updated', description: 'Order updated successfully' });
      fetchOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Wholesale Orders</h1>

      <div className="flex gap-2">
        {(['all', 'pending', 'delivered'] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f)}
            className="capitalize"
          >
            {f === 'all' ? 'All' : f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const filtered = statusFilter === 'all' ? orders : orders.filter(o => 
                  statusFilter === 'pending' ? !['delivered', 'cancelled'].includes(o.order_status) : o.order_status === 'delivered'
                );
                return filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
                </TableRow>
              ) : (
                filtered.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{order.seller_name}</TableCell>
                    <TableCell>{Array.isArray(order.items) ? order.items.length : 0} items</TableCell>
                    <TableCell className="font-bold">₹{order.total_amount}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        order.payment_status === 'verified' ? 'bg-green-100 text-green-800' :
                        order.payment_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {order.payment_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.order_status === 'verified' ? 'bg-green-100 text-green-800' :
                        order.order_status === 'rejected' || order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        order.order_status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {order.order_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setViewOrder(order); setProofUrl(order.payment_proof_url); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.payment_status === 'pending' && hasPermission("wholesale_orders", "update") && (
                          <>
                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => updateOrder(order.id, { payment_status: 'verified' })}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setRejectOrder(order); setRejectRemarks(''); }}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {order.payment_status === 'verified' && order.order_status === 'pending' && hasPermission("wholesale_orders", "update") && (
                          <Button size="icon" variant="ghost" onClick={() => updateOrder(order.id, { order_status: 'dispatched' })}>
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                        {order.order_status === 'dispatched' && hasPermission("wholesale_orders", "update") && (
                          <Button size="icon" variant="ghost" className="text-green-600" onClick={() => setPinOrder(order)} title="Mark as Delivered">
                            <PackageCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {order.order_status === 'dispatched' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-blue-600"
                            title="Go to Delivery"
                            onClick={async () => {
                              const { data: seller } = await supabase
                                .from('sellers')
                                .select('seller_latitude, seller_longitude')
                                .eq('id', order.seller_id)
                                .single();
                              if (seller?.seller_latitude && seller?.seller_longitude) {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${seller.seller_latitude},${seller.seller_longitude}`, '_blank');
                              } else {
                                toast({ title: 'Location not available', description: 'Seller location is not set', variant: 'destructive' });
                              }
                            }}
                          >
                            <Navigation className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewOrder && (
        <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order: {viewOrder.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span>{viewOrder.seller_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">₹{viewOrder.total_amount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span><Badge variant={viewOrder.payment_status === 'verified' ? 'default' : 'secondary'}>{viewOrder.payment_status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order Status</span><Badge variant="secondary">{viewOrder.order_status}</Badge></div>
              {viewOrder.delivery_address && (
                <div><span className="text-muted-foreground">Address:</span> {viewOrder.delivery_address}</div>
              )}
              {viewOrder.upi_transaction_id && (
                <div className="flex justify-between"><span className="text-muted-foreground">UPI Txn ID</span><span className="font-mono">{viewOrder.upi_transaction_id}</span></div>
              )}

              <div>
                <Label className="text-muted-foreground">Items:</Label>
                <div className="mt-1 space-y-1">
                  {Array.isArray(viewOrder.items) && viewOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between bg-muted/50 rounded p-2">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span>₹{item.selling_price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {proofUrl && (
                <div>
                  <Label className="text-muted-foreground">Payment Proof:</Label>
                  <img src={proofUrl} className="w-full rounded-lg border mt-1" alt="Payment proof" />
                </div>
              )}

              <div>
                <Label>Update Status</Label>
                <Select value={viewOrder.order_status} onValueChange={v => { updateOrder(viewOrder.id, { order_status: v }); setViewOrder({ ...viewOrder, order_status: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject with Remarks Modal */}
      {rejectOrder && (
        <Dialog open={!!rejectOrder} onOpenChange={(open) => { if (!open) setRejectOrder(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reject Order: {rejectOrder.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Rejection Remarks *</Label>
                <Textarea
                  value={rejectRemarks}
                  onChange={e => setRejectRemarks(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                variant="destructive"
                disabled={!rejectRemarks.trim()}
                onClick={() => {
                  updateOrder(rejectOrder.id, { payment_status: 'rejected', admin_notes: rejectRemarks.trim() });
                  setRejectOrder(null);
                  setRejectRemarks('');
                }}
              >
                Submit Rejection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* PIN Verification Modal for Mark as Delivered */}
      {pinOrder && (
        <PinVerificationModal
          open={!!pinOrder}
          onOpenChange={(open) => { if (!open) setPinOrder(null); }}
          expectedPin={pinOrder.delivery_pin || ''}
          orderNumber={pinOrder.id}
          onSuccess={() => {
            updateOrder(pinOrder.id, { order_status: 'delivered' });
            setPinOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default WholesaleOrders;
