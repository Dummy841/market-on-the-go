import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Calendar, TrendingUp, ShoppingBag, XCircle, Filter } from 'lucide-react';
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
  rejectedOrders: number;
  totalRevenue: number;
  sellerEarnings: number;
  rejectionPenalty: number;
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
    rejectedOrders: 0,
    totalRevenue: 0,
    totalEarnings: 0,
    totalPenalty: 0
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
      // Fetch orders that are delivered OR rejected (check both status and seller_status)
      const {
        data,
        error
      } = await supabase.from('orders').select('id, created_at, total_amount, status, items, seller_status').eq('seller_id', seller.id).gte('created_at', startDateTime).lte('created_at', endDateTime).order('created_at', {
        ascending: false
      });

      // Filter to only include delivered or rejected orders
      const filteredData = (data || []).filter(order => order.status === 'delivered' || order.status === 'rejected' || order.seller_status === 'delivered' || order.seller_status === 'rejected');
      if (error) throw error;
      setOrders(filteredData);
      calculateEarnings(filteredData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
  // Get today's stats using IST timezone (only current day orders)
  const getTodayStats = () => {
    const IST = 'Asia/Kolkata';
    const nowIST = toZonedTime(new Date(), IST);
    const todayIST = format(nowIST, 'yyyy-MM-dd');
    const franchisePercentage = seller?.franchise_percentage || 0;
    const REJECTION_PENALTY = 10;
    
    const todayOrders = orders.filter(order => {
      const orderDateIST = toZonedTime(parseISO(order.created_at), IST);
      return format(orderDateIST, 'yyyy-MM-dd') === todayIST;
    });
    
    let deliveredCount = 0;
    let rejectedCount = 0;
    let earnings = 0;
    let penalty = 0;
    
    todayOrders.forEach(order => {
      const isRejected = order.status === 'rejected' || order.seller_status === 'rejected';
      if (isRejected) {
        rejectedCount++;
        penalty += REJECTION_PENALTY;
      } else {
        deliveredCount++;
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const itemTotal = (item.seller_price || 0) * (item.quantity || 1);
            const deduction = itemTotal * franchisePercentage / 100;
            earnings += itemTotal - deduction;
          });
        }
      }
    });
    
    return { deliveredCount, rejectedCount, earnings: earnings - penalty, penalty };
  };

  const todayStats = getTodayStats();

  // Get all days of current month for display
  const getAllMonthDays = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const monthDays = getAllMonthDays();

  const calculateEarnings = (ordersData: Order[]) => {
    const franchisePercentage = seller?.franchise_percentage || 0;
    const REJECTION_PENALTY = 10; // ₹10 per rejected order

    // Group by date
    const earningsByDate = new Map<string, DailyEarning>();
    let totalOrders = 0;
    let rejectedOrders = 0;
    let totalRevenue = 0;
    let totalEarnings = 0;
    let totalPenalty = 0;
    ordersData.forEach(order => {
      const dateKey = format(parseISO(order.created_at), 'yyyy-MM-dd');
      const isRejected = order.status === 'rejected' || order.seller_status === 'rejected';

      // Calculate seller earnings from items (only for delivered orders)
      let orderSellerEarnings = 0;
      let orderPenalty = 0;
      if (isRejected) {
        orderPenalty = REJECTION_PENALTY;
      } else if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemTotal = (item.seller_price || 0) * (item.quantity || 1);
          const deduction = itemTotal * franchisePercentage / 100;
          orderSellerEarnings += itemTotal - deduction;
        });
      }
      const existing = earningsByDate.get(dateKey) || {
        date: dateKey,
        totalOrders: 0,
        rejectedOrders: 0,
        totalRevenue: 0,
        sellerEarnings: 0,
        rejectionPenalty: 0
      };
      earningsByDate.set(dateKey, {
        date: dateKey,
        totalOrders: existing.totalOrders + (isRejected ? 0 : 1),
        rejectedOrders: existing.rejectedOrders + (isRejected ? 1 : 0),
        totalRevenue: existing.totalRevenue + (isRejected ? 0 : order.total_amount),
        sellerEarnings: existing.sellerEarnings + orderSellerEarnings,
        rejectionPenalty: existing.rejectionPenalty + orderPenalty
      });
      if (isRejected) {
        rejectedOrders++;
        totalPenalty += orderPenalty;
      } else {
        totalOrders++;
        totalRevenue += order.total_amount;
        totalEarnings += orderSellerEarnings;
      }
    });

    // Convert map to array and sort by date descending
    const earningsArray = Array.from(earningsByDate.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDailyEarnings(earningsArray);
    setTotalStats({
      totalOrders,
      rejectedOrders,
      totalRevenue,
      totalEarnings: totalEarnings - totalPenalty,
      totalPenalty
    });
  };

  // Get daily earning for a specific date
  const getDayEarning = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return dailyEarnings.find(d => d.date === dateKey);
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
  const isOrderRejected = (order: Order) => {
    return order.status === 'rejected' || order.seller_status === 'rejected';
  };
  const getOrderEarnings = (order: Order) => {
    if (isOrderRejected(order)) {
      return -10; // ₹10 penalty for rejected orders
    }
    const franchisePercentage = seller?.franchise_percentage || 0;
    const itemsTotal = getOrderItemsTotal(order);
    const deduction = itemsTotal * franchisePercentage / 100;
    return itemsTotal - deduction;
  };
  return <div className="space-y-4">
      {/* Daily Earnings Summary - All Month Days with Horizontal Scroll */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm font-medium">Daily Earnings Summary</CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {monthDays.map(day => {
                  const dayEarning = getDayEarning(day);
                  const netEarnings = dayEarning ? dayEarning.sellerEarnings - dayEarning.rejectionPenalty : 0;
                  const hasData = !!dayEarning;
                  const isTodayDate = isToday(day);
                  
                  return (
                    <div 
                      key={format(day, 'yyyy-MM-dd')} 
                      className={`flex-shrink-0 border-l-2 ${isTodayDate ? 'border-l-green-500 bg-green-50' : hasData ? 'border-l-primary' : 'border-l-muted'} rounded-md p-1.5 min-w-[80px] ${hasData ? 'bg-card' : 'bg-muted/30'}`}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {format(day, 'dd MMM')}
                      </p>
                      <p className={`text-xs font-bold ${hasData ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {hasData ? formatCurrency(netEarnings) : '₹0'}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {hasData ? `${dayEarning.totalOrders} del${dayEarning.rejectedOrders > 0 ? `, ${dayEarning.rejectedOrders} rej` : ''}` : 'No orders'}
                      </p>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Compact Date Filter */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-xs">From</Label>
            <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-32 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-xs">To</Label>
            <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-32 text-xs" />
          </div>
          <Button onClick={fetchOrders} disabled={loading} size="sm" className="h-8">
            {loading ? 'Loading...' : 'Apply'}
          </Button>
          <Button 
            onClick={() => {
              const today = format(new Date(), 'yyyy-MM-dd');
              setStartDate(today);
              setEndDate(today);
            }} 
            variant="outline" 
            size="sm" 
            className="h-8"
          >
            Today
          </Button>
        </div>
      </Card>

      {/* Today's Summary Cards - Only Current Day */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-full">
              <ShoppingBag className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Delivered Orders</p>
              <p className="text-base font-bold">{todayStats.deliveredCount}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/10 rounded-full">
              <XCircle className="h-3 w-3 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Rejected Orders</p>
              <p className="text-base font-bold text-red-600">{todayStats.rejectedCount}</p>
              {todayStats.rejectedCount > 0 && <p className="text-[9px] text-red-500">-{formatCurrency(todayStats.penalty)} penalty</p>}
            </div>
          </div>
        </Card>
        
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-full">
              <TrendingUp className="h-3 w-3 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Net Earnings</p>
              <p className="text-base font-bold text-green-600">{formatCurrency(todayStats.earnings)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Order-wise Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Order-wise Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading orders...</p> : orders.length === 0 ? <p className="text-muted-foreground">No orders found.</p> : <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Items Total</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => {
                const rejected = isOrderRejected(order);
                const itemsTotal = getOrderItemsTotal(order);
                const earnings = getOrderEarnings(order);
                const franchisePercentage = seller?.franchise_percentage || 0;
                const deduction = rejected ? 0 : itemsTotal * franchisePercentage / 100;
                return <TableRow key={order.id} className={rejected ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono text-xs">
                        {order.id}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(order.created_at), 'dd MMM yyyy, HH:mm')}
                      </TableCell>
                      <TableCell>
                        {rejected ? <Badge variant="destructive" className="text-xs">Rejected</Badge> : <Badge variant="default" className="text-xs bg-green-600">Delivered</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          {Array.isArray(order.items) && order.items.map((item: any, idx: number) => <div key={idx}>
                              {item.item_name} × {item.quantity || 1}
                            </div>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {rejected ? '-' : formatCurrency(itemsTotal)}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        {rejected ? '₹10 penalty' : `-${formatCurrency(deduction)}`}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${rejected ? 'text-red-600' : 'text-green-600'}`}>
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