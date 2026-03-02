import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, CheckCircle, XCircle, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState<WholesaleOrder | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
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

  const updateOrder = async (orderId: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('wholesale_orders' as any)
        .update(updates as any)
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: 'Updated', description: 'Order updated successfully' });
      fetchOrders();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Wholesale Orders</h1>

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
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet</TableCell>
                </TableRow>
              ) : (
                orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{order.seller_name}</TableCell>
                    <TableCell>{Array.isArray(order.items) ? order.items.length : 0} items</TableCell>
                    <TableCell className="font-bold">₹{order.total_amount}</TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'verified' ? 'default' : order.payment_status === 'rejected' ? 'destructive' : 'secondary'}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(statusColors[order.order_status] as any) || 'secondary'}>
                        {order.order_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setViewOrder(order); setProofUrl(order.payment_proof_url); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.payment_status === 'pending' && (
                          <>
                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => updateOrder(order.id, { payment_status: 'verified' })}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => updateOrder(order.id, { payment_status: 'rejected' })}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {order.payment_status === 'verified' && order.order_status === 'pending' && (
                          <Button size="icon" variant="ghost" onClick={() => updateOrder(order.id, { order_status: 'dispatched' })}>
                            <Truck className="w-4 h-4" />
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
    </div>
  );
};

export default WholesaleOrders;
