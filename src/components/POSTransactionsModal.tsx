import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Printer, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface OrderItem {
  item_name: string;
  barcode?: string | null;
  quantity: number;
  seller_price: number;
  mrp: number;
  gst_percentage: number;
}

interface PosOrder {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  status: string;
  items: OrderItem[];
  gst_charges: number;
  user_id: string;
  customer_name?: string;
  customer_mobile?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: string;
  sellerName: string;
}

const POSTransactionsModal = ({ open, onOpenChange, sellerId, sellerName }: Props) => {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState<PosOrder | null>(null);
  const [printOrder, setPrintOrder] = useState<PosOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('delivery_address', 'POS - In Store')
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch customer names for non-walkIn orders
      const userIds = [...new Set(data.map(o => o.user_id).filter(id => id !== '00000000-0000-0000-0000-000000000000'))];
      let usersMap: Record<string, { name: string; mobile: string }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name, mobile').in('id', userIds);
        if (users) users.forEach(u => { usersMap[u.id] = { name: u.name, mobile: u.mobile }; });
      }
      setOrders(data.map(o => ({
        ...o,
        items: (Array.isArray(o.items) ? o.items : []) as unknown as OrderItem[],
        customer_name: usersMap[o.user_id]?.name || (o.user_id === '00000000-0000-0000-0000-000000000000' ? 'Walk-in' : '-'),
        customer_mobile: usersMap[o.user_id]?.mobile || '',
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchOrders();
  }, [open, dateFrom, dateTo]);

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'CASH';
    if (method === 'upi') return 'UPI';
    if (method === 'card') return 'CARD';
    return method.toUpperCase();
  };

  const handlePrint = (order: PosOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      const content = printRef.current;
      if (!content) return;
      const win = window.open('', '_blank', 'width=400,height=700');
      if (!win) return;
      win.document.write(`
        <html><head><title>Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; max-width: 350px; margin: 0 auto; color: #000; }
          .center { text-align: center; }
          .right { text-align: right; }
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
        ${content.innerHTML}
        <script>window.print();window.onafterprint=function(){window.close();}<\/script>
        </body></html>
      `);
      win.document.close();
      setPrintOrder(null);
    }, 100);
  };

  const renderReceipt = (order: PosOrder) => {
    const items = order.items;
    const subtotal = items.reduce((s, i) => s + (i.seller_price * i.quantity), 0);
    const totalMrp = items.reduce((s, i) => s + (i.mrp * i.quantity), 0);
    const saved = totalMrp - subtotal;

    return (
      <div>
        <div className="center title">{sellerName}</div>
        <div className="line"></div>
        <div className="row"><span style={{ color: '#d97706' }}>Order #:</span><span>{order.id}</span></div>
        <div className="row"><span style={{ color: '#d97706' }}>Date:</span><span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span></div>
        {order.customer_name && order.customer_name !== 'Walk-in' && (
          <>
            <div className="row"><span style={{ color: '#d97706' }}>Customer:</span><span>{order.customer_name}</span></div>
            {order.customer_mobile && <div className="row"><span style={{ color: '#d97706' }}>Phone:</span><span>{order.customer_mobile}</span></div>}
          </>
        )}
        <div className="line"></div>
        {items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 6 }}>
            <div className="item-name">{item.item_name}</div>
            {item.mrp > item.seller_price && (
              <div className="item-mrp">&nbsp;&nbsp;MRP: ₹{Number(item.mrp).toFixed(2)}</div>
            )}
            <div className="row">
              <span>&nbsp;&nbsp;₹{Number(item.seller_price).toFixed(2)} × {item.quantity}</span>
              <span>₹{(item.seller_price * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="line"></div>
        <div className="row"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
        <div className="row"><span>GST:</span><span>₹{Number(order.gst_charges).toFixed(2)}</span></div>
        <div className="line"></div>
        <div className="row bold"><span>TOTAL:</span><span style={{ fontSize: 16 }}>₹{Number(order.total_amount).toFixed(2)}</span></div>
        {saved > 0 && (
          <div className="saved-box">
            <div>🎉 YOU SAVED</div>
            <div className="saved-amount">₹{saved.toFixed(2)}</div>
          </div>
        )}
        <div className="center muted" style={{ marginTop: 10 }}>{getPaymentLabel(order.payment_method)} - COMPLETED</div>
        <div className="line"></div>
        <div className="footer">Thank you for your purchase!<br/>Visit again</div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>POS Transactions</DialogTitle>
          </DialogHeader>

          {/* Date Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-auto" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-auto" />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No transactions found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="text-xs">{format(new Date(order.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="text-sm">{order.customer_name}</TableCell>
                      <TableCell className="text-right font-semibold">₹{Number(order.total_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{getPaymentLabel(order.payment_method)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewOrder(order)}>
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(order)}>
                              <Printer className="w-4 h-4 mr-2" /> Print
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono">{viewOrder.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(viewOrder.created_at), 'dd/MM/yyyy HH:mm')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{viewOrder.customer_name}</span></div>
              {viewOrder.customer_mobile && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{viewOrder.customer_mobile}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{getPaymentLabel(viewOrder.payment_method)}</span></div>
              <hr className="border-border" />
              {viewOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.item_name} × {item.quantity}</span>
                  <span className="font-semibold">₹{(item.seller_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <hr className="border-border" />
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>₹{Number(viewOrder.gst_charges).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{Number(viewOrder.total_amount).toFixed(2)}</span></div>
              <Button className="w-full" onClick={() => { setViewOrder(null); handlePrint(viewOrder); }}>
                <Printer className="w-4 h-4 mr-2" /> Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden print content */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef}>
          {printOrder && renderReceipt(printOrder)}
        </div>
      </div>
    </>
  );
};

export default POSTransactionsModal;
