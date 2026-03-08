import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Printer, Languages } from 'lucide-react';
import SellerHamburgerMenu from '@/components/SellerHamburgerMenu';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface OrderItem {
  item_name: string;
  telugu_name?: string | null;
  barcode?: string | null;
  quantity: number;
  seller_price: number;
  mrp: number;
  gst_percentage: number;
  purchase_price?: number;
  id?: string;
  item_id?: string;
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

const POSTransactions = () => {
  const { seller, loading } = useSellerAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterMode, setFilterMode] = useState<'date' | 'all'>('date');
  const [fetching, setFetching] = useState(false);
  const [viewOrder, setViewOrder] = useState<PosOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [printOrder, setPrintOrder] = useState<PosOrder | null>(null);
  const [printLanguage, setPrintLanguage] = useState<'english' | 'telugu'>('english');

  useEffect(() => {
    if (!loading && !seller) navigate('/seller-login');
  }, [seller, loading, navigate]);

  const fetchOrders = async () => {
    if (!seller) return;
    setFetching(true);

    let query = supabase.
    from('orders').
    select('*').
    eq('seller_id', seller.id).
    eq('delivery_address', 'POS - In Store').
    order('created_at', { ascending: false });

    if (filterMode === 'date') {
      const fromDate = new Date(selectedDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(selectedDate);
      toDate.setHours(23, 59, 59, 999);
      query = query.gte('created_at', fromDate.toISOString()).lte('created_at', toDate.toISOString());
    }

    const { data } = await query;

    if (data) {
      const userIds = [...new Set(data.map((o) => o.user_id).filter((id) => id !== '00000000-0000-0000-0000-000000000000'))];
      let usersMap: Record<string, {name: string;mobile: string;}> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name, mobile').in('id', userIds);
        if (users) users.forEach((u) => {usersMap[u.id] = { name: u.name, mobile: u.mobile };});
      }

      // Collect all item IDs to fetch purchase prices
      const allItemIds = new Set<string>();
      data.forEach((o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((i: any) => {
          const itemId = i.item_id || i.id;
          if (itemId) allItemIds.add(itemId);
        });
      });

      let purchasePriceMap: Record<string, number> = {};
      if (allItemIds.size > 0) {
        const ids = Array.from(allItemIds);
        const { data: itemsData } = await supabase.
        from('items').
        select('id, purchase_price').
        in('id', ids);
        if (itemsData) {
          itemsData.forEach((item) => {purchasePriceMap[item.id] = Number(item.purchase_price);});
        }
      }

      setOrders(data.map((o) => ({
        ...o,
        items: (Array.isArray(o.items) ? o.items : []).map((i: any) => ({
          ...i,
          purchase_price: purchasePriceMap[i.item_id || i.id] || 0
        })) as unknown as OrderItem[],
        customer_name: usersMap[o.user_id]?.name || (o.user_id === '00000000-0000-0000-0000-000000000000' ? 'Walk-in' : '-'),
        customer_mobile: usersMap[o.user_id]?.mobile || ''
      })));
    }
    setFetching(false);
  };

  useEffect(() => {
    if (seller) fetchOrders();
  }, [seller, selectedDate, filterMode]);

  const totalSale = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalPurchase = orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0);
  }, 0);
  const totalProfit = totalSale - totalPurchase;

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'CASH';
    if (method === 'upi') return 'UPI';
    if (method === 'card') return 'CARD';
    return method.toUpperCase();
  };

  const fetchTeluguNames = async (items: OrderItem[]): Promise<Record<string, string>> => {
    const itemIds = items.map((i) => (i as any).item_id || i.id).filter(Boolean) as string[];
    if (itemIds.length === 0) return {};
    const { data } = await supabase.
    from('items').
    select('id, telugu_name').
    in('id', itemIds);
    const map: Record<string, string> = {};
    data?.forEach((d) => {if (d.telugu_name) map[d.id] = d.telugu_name;});
    return map;
  };

  const handlePrint = async (order: PosOrder, language: 'english' | 'telugu' = 'english') => {
    let teluguMap: Record<string, string> = {};
    if (language === 'telugu') {
      teluguMap = await fetchTeluguNames(order.items);
    }
    setPrintLanguage(language);
    setPrintOrder({ ...order, items: order.items.map((i) => ({ ...i, telugu_name: (i as any).item_id || i.id ? teluguMap[(i as any).item_id || i.id] : undefined })) });
    setTimeout(() => {
      const content = printRef.current;
      if (!content) return;
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
          @media print { body { padding: 0; padding-top: env(safe-area-inset-top); } }
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

  const renderReceipt = (order: PosOrder, language: 'english' | 'telugu') => {
    const items = order.items;
    const subtotal = items.reduce((s, i) => s + i.seller_price * i.quantity, 0);
    const totalMrp = items.reduce((s, i) => s + i.mrp * i.quantity, 0);
    const saved = totalMrp - subtotal;

    return (
      <div>
        <div className="center title">{seller?.seller_name}</div>
        <div className="line"></div>
        <div className="row"><span style={{ color: '#d97706' }}>Order #:</span><span>{order.id}</span></div>
        <div className="row"><span style={{ color: '#d97706' }}>Date:</span><span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span></div>
        {order.customer_name && order.customer_name !== 'Walk-in' &&
        <>
            <div className="row"><span style={{ color: '#d97706' }}>Customer:</span><span>{order.customer_name}</span></div>
            {order.customer_mobile && <div className="row"><span style={{ color: '#d97706' }}>Phone:</span><span>{order.customer_mobile}</span></div>}
          </>
        }
        <div className="line"></div>
        {items.map((item, idx) => {
          const displayName = language === 'telugu' && item.telugu_name ? item.telugu_name : item.item_name;
          return (
            <div key={idx} style={{ marginBottom: 6 }}>
              <div className="item-name">{displayName}</div>
              {item.mrp > item.seller_price &&
              <div className="item-mrp">&nbsp;&nbsp;MRP: ₹{Number(item.mrp).toFixed(2)}</div>
              }
              <div className="row">
                <span>&nbsp;&nbsp;₹{Number(item.seller_price).toFixed(2)} × {item.quantity}</span>
                <span>₹{(item.seller_price * item.quantity).toFixed(2)}</span>
              </div>
              {item.gst_percentage > 0 &&
              <div className="row muted">
                  <span>&nbsp;&nbsp;GST ({item.gst_percentage}%)</span>
                  <span>₹{(item.seller_price * item.quantity * item.gst_percentage / 100).toFixed(2)}</span>
                </div>
              }
            </div>);

        })}
        <div className="line"></div>
        <div className="row"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
        <div className="row"><span>GST:</span><span>₹{Number(order.gst_charges).toFixed(2)}</span></div>
        <div className="line"></div>
        <div className="row bold"><span>TOTAL:</span><span style={{ fontSize: 16 }}>₹{Number(order.total_amount).toFixed(2)}</span></div>
        {saved > 0 &&
        <div className="saved-box">
            <div>🎉 YOU SAVED</div>
            <div className="saved-amount">₹{saved.toFixed(2)}</div>
          </div>
        }
        <div className="center muted" style={{ marginTop: 10 }}>{getPaymentLabel(order.payment_method)} - COMPLETED</div>
        <div className="line"></div>
        <div className="footer">Thank you for your purchase!<br />Visit again</div>
      </div>);

  };

  if (loading || !seller) return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-3" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <SellerHamburgerMenu />
          
        </div>
      </header>

      {/* Date Filters + Stats */}
      <div className="bg-card border-b border-border p-3 flex gap-3 items-center flex-wrap">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => {setSelectedDate(e.target.value);setFilterMode('date');}}
          className="w-auto" />
        
        <Button
          variant={filterMode === 'date' && selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
          size="sm"
          onClick={() => {setSelectedDate(format(new Date(), 'yyyy-MM-dd'));setFilterMode('date');}}>
          
          Today
        </Button>
        <Button
          variant={filterMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterMode('all')}>
          
          All
        </Button>
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Purchase</div>
            <div className="text-base font-bold text-muted-foreground">₹{totalPurchase.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Sale</div>
            <div className="text-base font-bold text-primary">₹{totalSale.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Profit</div>
            <div className={`text-base font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>₹{totalProfit.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-3">
        {fetching ?
        <p className="text-center py-8 text-muted-foreground">Loading...</p> :
        orders.length === 0 ?
        <p className="text-center py-8 text-muted-foreground">No transactions found</p> :

        <div className="overflow-x-auto">
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
                {orders.map((order) =>
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
                          <DropdownMenuItem onClick={() => handlePrint(order, 'english')}>
                            <Printer className="w-4 h-4 mr-2" /> Print in English
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrint(order, 'telugu')}>
                            <Languages className="w-4 h-4 mr-2" /> Print in Telugu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
        }
      </div>

      {/* View Order Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {viewOrder &&
          <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono">{viewOrder.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(viewOrder.created_at), 'dd/MM/yyyy HH:mm')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{viewOrder.customer_name}</span></div>
              {viewOrder.customer_mobile && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{viewOrder.customer_mobile}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{getPaymentLabel(viewOrder.payment_method)}</span></div>
              <hr className="border-border" />
              {viewOrder.items.map((item, idx) =>
            <div key={idx}>
                  <div className="flex justify-between">
                    <span>{item.item_name} × {item.quantity}</span>
                    <span className="font-semibold">₹{(item.seller_price * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.gst_percentage > 0 &&
              <div className="flex justify-between text-xs text-muted-foreground">
                      <span>&nbsp;&nbsp;GST ({item.gst_percentage}%)</span>
                      <span>₹{(item.seller_price * item.quantity * item.gst_percentage / 100).toFixed(2)}</span>
                    </div>
              }
                </div>
            )}
              <hr className="border-border" />
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>₹{Number(viewOrder.gst_charges).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{Number(viewOrder.total_amount).toFixed(2)}</span></div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => {setViewOrder(null);handlePrint(viewOrder, 'english');}}>
                  <Printer className="w-4 h-4 mr-1" /> English
                </Button>
                <Button className="flex-1" onClick={() => {setViewOrder(null);handlePrint(viewOrder, 'telugu');}}>
                  <Languages className="w-4 h-4 mr-1" /> Telugu
                </Button>
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Hidden print content */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef}>
          {printOrder && renderReceipt(printOrder, printLanguage)}
        </div>
      </div>
    </div>);

};

export default POSTransactions;