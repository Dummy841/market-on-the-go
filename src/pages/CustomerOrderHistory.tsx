
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ChevronLeft, 
  Clock,
  MapPin,
  Phone
} from 'lucide-react';

interface CustomerOrder {
  id: string;
  customerName: string;
  customerMobile: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  couponUsed: string | null;
  paymentMethod: string;
  timestamp: string;
  status: string;
}

const CustomerOrderHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  
  // Get current customer
  const currentCustomer = localStorage.getItem('currentCustomer');
  const customer = currentCustomer ? JSON.parse(currentCustomer) : null;

  useEffect(() => {
    if (!customer) {
      navigate('/customer-login');
      return;
    }

    // Load orders from transactions in localStorage
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
      try {
        const allTransactions = JSON.parse(savedTransactions);
        // Filter orders for current customer
        const customerOrders = allTransactions.filter((transaction: CustomerOrder) => 
          transaction.customerMobile === customer.mobile || 
          transaction.customerName === customer.name
        );
        setOrders(customerOrders.reverse()); // Most recent first
      } catch (error) {
        console.error('Error loading orders:', error);
        setOrders([]);
      }
    }
  }, [customer, navigate]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/customer-home')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-agri-primary" />
            <span className="text-lg font-bold">My Orders</span>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                You haven't placed any orders yet
              </p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/customer-products')}
              >
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {formatDate(order.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status || 'completed')}>
                        {order.status || 'completed'}
                      </Badge>
                      <p className="text-lg font-bold mt-1">₹{order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Items */}
                    <div>
                      <h4 className="font-medium mb-2">Items:</h4>
                      <div className="space-y-1">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.name} x{item.quantity}</span>
                            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        )) || <span className="text-muted-foreground">No items</span>}
                      </div>
                    </div>
                    
                    {/* Payment Method */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <Badge variant="outline">
                        {order.paymentMethod === 'upi' || order.paymentMethod === 'card' ? 'Online' : 'Cash'}
                      </Badge>
                    </div>
                    
                    {/* Tracking Info */}
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {(order.status || 'completed') === 'delivered' 
                          ? 'Order has been delivered' 
                          : 'Order is being processed'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrderHistory;
