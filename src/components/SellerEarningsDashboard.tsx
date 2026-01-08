import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Calendar, TrendingUp, IndianRupee, ShoppingBag } from 'lucide-react';
interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: any;
  seller_status: string;
}
interface DailyEarning {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  sellerEarnings: number;
}
const SellerEarningsDashboard = () => {
  const {
    seller
  } = useSellerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalEarnings: 0
  });
  useEffect(() => {
    if (seller) {
      fetchOrders();
    }
  }, [seller, startDate, endDate]);
  const fetchOrders = async () => {
    if (!seller) return;
    setLoading(true);
    try {
      const startDateTime = startOfDay(parseISO(startDate)).toISOString();
      const endDateTime = endOfDay(parseISO(endDate)).toISOString();
      const {
        data,
        error
      } = await supabase.from('orders').select('id, created_at, total_amount, status, items, seller_status').eq('seller_id', seller.id).eq('status', 'delivered').gte('created_at', startDateTime).lte('created_at', endDateTime).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setOrders(data || []);
      calculateEarnings(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
  const calculateEarnings = (ordersData: Order[]) => {
    const franchisePercentage = seller?.franchise_percentage || 0;

    // Group by date
    const earningsByDate = new Map<string, DailyEarning>();
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalEarnings = 0;
    ordersData.forEach(order => {
      const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');

      // Calculate seller earnings from items
      let orderSellerEarnings = 0;
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemTotal = (item.seller_price || 0) * (item.quantity || 1);
          const deduction = itemTotal * franchisePercentage / 100;
          orderSellerEarnings += itemTotal - deduction;
        });
      }
      const existing = earningsByDate.get(dateKey) || {
        date: dateKey,
        totalOrders: 0,
        totalRevenue: 0,
        sellerEarnings: 0
      };
      earningsByDate.set(dateKey, {
        date: dateKey,
        totalOrders: existing.totalOrders + 1,
        totalRevenue: existing.totalRevenue + order.total_amount,
        sellerEarnings: existing.sellerEarnings + orderSellerEarnings
      });
      totalOrders++;
      totalRevenue += order.total_amount;
      totalEarnings += orderSellerEarnings;
    });

    // Convert map to array and sort by date descending
    const earningsArray = Array.from(earningsByDate.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDailyEarnings(earningsArray);
    setTotalStats({
      totalOrders,
      totalRevenue,
      totalEarnings
    });
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  const getOrderItemsTotal = (order: Order) => {
    if (!Array.isArray(order.items)) return 0;
    return order.items.reduce((sum: number, item: any) => {
      return sum + (item.seller_price || 0) * (item.quantity || 1);
    }, 0);
  };
  const getOrderEarnings = (order: Order) => {
    const franchisePercentage = seller?.franchise_percentage || 0;
    const itemsTotal = getOrderItemsTotal(order);
    const deduction = itemsTotal * franchisePercentage / 100;
    return itemsTotal - deduction;
  };
  return <div className="space-y-6">
      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter by Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchOrders} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filter'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalStats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Earnings</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalEarnings)}</p>
                
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Earnings Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Earnings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : dailyEarnings.length === 0 ? <p className="text-muted-foreground">No delivered orders in this date range.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyEarnings.map(day => <Card key={day.date} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {format(parseISO(day.date), 'dd MMM yyyy')}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(day.sellerEarnings)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {day.totalOrders} order{day.totalOrders > 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </CardContent>
      </Card>

      {/* Order-wise Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order-wise Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading orders...</p> : orders.length === 0 ? <p className="text-muted-foreground">No delivered orders found.</p> : <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Items Total</TableHead>
                    <TableHead className="text-right">Deduction ({seller?.franchise_percentage || 0}%)</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => {
                const itemsTotal = getOrderItemsTotal(order);
                const earnings = getOrderEarnings(order);
                const deduction = itemsTotal - earnings;
                return <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          #{order.id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(order.created_at), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => <div key={idx}>
                                {item.item_name} × {item.quantity || 1}
                              </div>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(itemsTotal)}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          -{formatCurrency(deduction)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(earnings)}
                        </TableCell>
                      </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default SellerEarningsDashboard;