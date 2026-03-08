import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Download, IndianRupee, TrendingUp, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isToday, parseISO, isSameDay } from 'date-fns';

type FilterType = 'today' | 'date' | 'month' | 'all';

interface WholesaleOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  selling_price: number;
  purchase_price?: number;
  mrp?: number;
}

interface DeliveredOrder {
  id: string;
  seller_name: string;
  items: WholesaleOrderItem[];
  total_amount: number;
  created_at: string;
}

const WholesaleRevenue = () => {
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [products, setProducts] = useState<Record<string, { purchase_price: number; mrp: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('today');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from('wholesale_orders' as any)
          .select('*')
          .eq('order_status', 'delivered')
          .order('created_at', { ascending: false }),
        supabase
          .from('wholesale_products' as any)
          .select('id, purchase_price, mrp')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as any);
      if (productsRes.data) {
        const map: Record<string, { purchase_price: number; mrp: number }> = {};
        (productsRes.data as any[]).forEach(p => {
          map[p.id] = { purchase_price: p.purchase_price, mrp: p.mrp };
        });
        setProducts(map);
      }
    } catch (error) {
      console.error('Error fetching wholesale revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = parseISO(order.created_at);
      switch (filter) {
        case 'today':
          return isToday(orderDate);
        case 'date':
          return isSameDay(orderDate, parseISO(selectedDate));
        case 'month': {
          const monthDate = parseISO(selectedMonth + '-01');
          return orderDate >= startOfMonth(monthDate) && orderDate <= endOfMonth(monthDate);
        }
        case 'all':
          return true;
        default:
          return true;
      }
    });
  }, [orders, filter, selectedDate, selectedMonth]);

  const stats = useMemo(() => {
    let totalPurchase = 0;
    let totalSale = 0;

    filteredOrders.forEach(order => {
      const items: WholesaleOrderItem[] = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        const qty = item.quantity || 0;
        const salePrice = item.selling_price || 0;
        const productInfo = products[item.product_id];
        const purchasePrice = item.purchase_price ?? productInfo?.purchase_price ?? 0;

        totalPurchase += purchasePrice * qty;
        totalSale += salePrice * qty;
      });
    });

    return {
      totalPurchase,
      totalSale,
      profit: totalSale - totalPurchase,
      orderCount: filteredOrders.length,
    };
  }, [filteredOrders, products]);

  const handleExport = () => {
    const headers = ['Order ID', 'Seller', 'Items', 'Purchase Total', 'Sale Total', 'Profit', 'Date'];
    const rows = filteredOrders.map(order => {
      const items: WholesaleOrderItem[] = Array.isArray(order.items) ? order.items : [];
      let orderPurchase = 0;
      let orderSale = 0;
      items.forEach(item => {
        const qty = item.quantity || 0;
        const productInfo = products[item.product_id];
        const purchasePrice = item.purchase_price ?? productInfo?.purchase_price ?? 0;
        orderPurchase += purchasePrice * qty;
        orderSale += (item.selling_price || 0) * qty;
      });
      return [
        order.id,
        order.seller_name,
        items.length,
        orderPurchase.toFixed(2),
        orderSale.toFixed(2),
        (orderSale - orderPurchase).toFixed(2),
        format(parseISO(order.created_at), 'dd/MM/yyyy'),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wholesale-revenue-${filter === 'today' ? 'today' : filter === 'date' ? selectedDate : filter === 'month' ? selectedMonth : 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilterLabel = () => {
    switch (filter) {
      case 'today': return 'Today';
      case 'date': return format(parseISO(selectedDate), 'dd MMM yyyy');
      case 'month': return format(parseISO(selectedMonth + '-01'), 'MMM yyyy');
      case 'all': return 'All Time';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Wholesale Revenue</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredOrders.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['today', 'date', 'month', 'all'] as FilterType[]).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'today' ? 'Today' : f === 'date' ? 'Date' : f === 'month' ? 'Month' : 'All'}
          </Button>
        ))}

        {filter === 'date' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(format(d, 'yyyy-MM-dd'));
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-auto h-8 text-sm"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(format(d, 'yyyy-MM-dd'));
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {filter === 'month' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(selectedMonth + '-01');
              d.setMonth(d.getMonth() - 1);
              setSelectedMonth(format(d, 'yyyy-MM'));
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-auto h-8 text-sm"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(selectedMonth + '-01');
              d.setMonth(d.getMonth() + 1);
              setSelectedMonth(format(d, 'yyyy-MM'));
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="px-3 py-2 rounded-lg border">
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] mb-0.5">
            <Package className="w-3 h-3" /> Orders
          </div>
          <p className="text-lg font-bold">{stats.orderCount}</p>
        </div>
        <div className="px-3 py-2 rounded-lg border">
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] mb-0.5">
            <IndianRupee className="w-3 h-3" /> Purchase
          </div>
          <p className="text-lg font-bold">₹{stats.totalPurchase.toLocaleString('en-IN')}</p>
        </div>
        <div className="px-3 py-2 rounded-lg border">
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] mb-0.5">
            <IndianRupee className="w-3 h-3" /> Sale
          </div>
          <p className="text-lg font-bold">₹{stats.totalSale.toLocaleString('en-IN')}</p>
        </div>
        <div className="px-3 py-2 rounded-lg border">
          <div className="flex items-center gap-1 text-[10px] mb-0.5" style={{ color: stats.profit >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
            <TrendingUp className="w-3 h-3" /> Profit
          </div>
          <p className={`text-lg font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            ₹{stats.profit.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Orders Table */}
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
                <TableHead>Purchase</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No delivered orders for {getFilterLabel().toLowerCase()}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => {
                  const items: WholesaleOrderItem[] = Array.isArray(order.items) ? order.items : [];
                  let orderPurchase = 0;
                  let orderSale = 0;
                  items.forEach(item => {
                    const qty = item.quantity || 0;
                    const productInfo = products[item.product_id];
                    const purchasePrice = item.purchase_price ?? productInfo?.purchase_price ?? 0;
                    orderPurchase += purchasePrice * qty;
                    orderSale += (item.selling_price || 0) * qty;
                  });
                  const orderProfit = orderSale - orderPurchase;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell>{order.seller_name}</TableCell>
                      <TableCell>{items.length} items</TableCell>
                      <TableCell>₹{orderPurchase.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="font-bold">₹{orderSale.toLocaleString('en-IN')}</TableCell>
                      <TableCell className={orderProfit >= 0 ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
                        ₹{orderProfit.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(parseISO(order.created_at), 'dd MMM yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default WholesaleRevenue;
