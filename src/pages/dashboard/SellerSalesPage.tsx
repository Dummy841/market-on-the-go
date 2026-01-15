import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Package, Eye, IndianRupee } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Order {
  id: string;
  items: any;
  total_amount: number;
  status: string;
  delivery_address: string;
  created_at: string;
  delivered_at: string | null;
  payment_method: string;
  delivery_mobile: string | null;
  user_id: string;
}

const SellerSalesPage = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState('');
  const [franchisePercentage, setFranchisePercentage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (sellerId) {
      fetchSellerAndOrders();
    }
  }, [sellerId]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, dateFilter]);

  const fetchSellerAndOrders = async () => {
    try {
      // Fetch seller info
      const { data: seller } = await supabase
        .from('sellers')
        .select('seller_name, franchise_percentage')
        .eq('id', sellerId)
        .single();
      
      if (seller) {
        setSellerName(seller.seller_name);
        setFranchisePercentage(seller.franchise_percentage || 0);
      }

      // Fetch orders
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by status - 'rejected' filter shows both rejected and refunded
    if (statusFilter !== 'all') {
      if (statusFilter === 'rejected') {
        filtered = filtered.filter(order => order.status === 'rejected' || order.status === 'refunded');
      } else {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
        return orderDate === dateFilter;
      });
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-500">Delivered</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'refunded':
        return <Badge variant="outline">refunded</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'preparing':
        return <Badge className="bg-yellow-500">Preparing</Badge>;
      case 'out_for_delivery':
        return <Badge className="bg-purple-500">Out for Delivery</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    // Fetch customer name
    try {
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('id', order.user_id)
        .single();
      setCustomerName(data?.name || 'N/A');
    } catch {
      setCustomerName('N/A');
    }
  };

  const PENALTY_AMOUNT = 10;

  // Calculate seller earnings from items (sum of seller_price * quantity)
  const calculateSellerEarnings = (ordersToCalc: Order[]) => {
    const deliveredEarnings = ordersToCalc
      .filter(o => o.status === 'delivered')
      .reduce((sum, order) => {
        if (Array.isArray(order.items)) {
          const orderEarning = order.items.reduce((itemSum: number, item: any) => {
            const sellerPrice = Number(item.seller_price) || 0;
            const quantity = Number(item.quantity) || 1;
            return itemSum + (sellerPrice * quantity);
          }, 0);
          // Apply franchise percentage deduction
          const afterCommission = orderEarning * (1 - franchisePercentage / 100);
          return sum + afterCommission;
        }
        return sum;
      }, 0);
    
    // Deduct penalty for rejected orders
    const rejectedCount = ordersToCalc.filter(o => o.status === 'rejected' || o.status === 'refunded').length;
    const totalPenalty = rejectedCount * PENALTY_AMOUNT;
    
    return deliveredEarnings - totalPenalty;
  };

  // Stats based on filtered orders for day-wise filtering
  const rejectedOrders = filteredOrders.filter(o => o.status === 'rejected' || o.status === 'refunded');
  const totalPenalty = rejectedOrders.length * PENALTY_AMOUNT;
  
  const stats = {
    total: filteredOrders.length,
    delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    rejected: rejectedOrders.length,
    totalRevenue: filteredOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total_amount), 0) + totalPenalty,
    sellerEarnings: calculateSellerEarnings(filteredOrders),
    totalPenalty
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/sellers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Sales - {sellerName}</h2>
          <p className="text-muted-foreground">All orders for this seller</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <p className="text-sm text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">₹{stats.totalRevenue.toFixed(0)}</div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">₹{stats.sellerEarnings.toFixed(0)}</div>
            <p className="text-sm text-muted-foreground">Seller Earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'delivered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('delivered')}
              >
                Delivered
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter('rejected');
                }}
              >
                Rejected
              </Button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
              {dateFilter && (
                <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found with the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const isRejected = order.status === 'rejected' || order.status === 'refunded';
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-primary">{order.id}</TableCell>
                      <TableCell>
                        <div>₹{Number(order.total_amount).toFixed(0)}</div>
                        {isRejected && (
                          <div className="text-xs text-red-600">Penalty: -₹{PENALTY_AMOUNT}</div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{order.payment_method}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.created_at), 'dd MMM yyyy')}
                          <div className="text-muted-foreground">
                            {format(new Date(order.created_at), 'hh:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium text-primary">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Customer Details</p>
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="font-medium">{customerName}</p>
                  <p className="text-sm">{selectedOrder.delivery_mobile || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span>₹{(Number(item.franchise_price) * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{Number(selectedOrder.total_amount).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Delivery Address</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">{selectedOrder.delivery_address}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {format(new Date(selectedOrder.created_at), 'dd MMM yyyy, hh:mm a')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerSalesPage;
