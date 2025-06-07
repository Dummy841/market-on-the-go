
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ArrowLeft, 
  List, 
  ShoppingBag, 
  Clock,
  ChevronRight,
  CheckCircle,
  TruckIcon,
  Package as PackageIcon,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// Order status types
type OrderStatus = 'placed' | 'packed' | 'shipping' | 'delivered' | 'cancelled';

// Order type
interface Order {
  id: string;
  customerId: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: OrderStatus;
  date: string;
  trackingInfo?: string;
}

// Mock order data
const mockOrders: Order[] = [
  {
    id: 'ORD12345',
    customerId: 'cust_1',
    items: [
      { name: 'Organic Tomatoes', quantity: 2, price: 100 },
      { name: 'Fresh Potatoes', quantity: 1, price: 30 }
    ],
    totalAmount: 130,
    status: 'delivered',
    date: new Date(2025, 4, 1).toISOString(),
  },
  {
    id: 'ORD12346',
    customerId: 'cust_1',
    items: [
      { name: 'Brown Rice', quantity: 3, price: 180 },
      { name: 'Raw Honey', quantity: 1, price: 250 }
    ],
    totalAmount: 430,
    status: 'shipping',
    date: new Date(2025, 4, 4).toISOString(),
    trackingInfo: 'TRK789012'
  },
  {
    id: 'ORD12347',
    customerId: 'cust_1',
    items: [
      { name: 'Organic Tomatoes', quantity: 1, price: 50 }
    ],
    totalAmount: 50,
    status: 'placed',
    date: new Date(2025, 4, 5).toISOString(),
  }
];

const OrderHistory = () => {
  const navigate = useNavigate();
  
  // Get customer data from localStorage
  const customerString = localStorage.getItem('currentCustomer');
  const customer = customerString ? JSON.parse(customerString) : null;
  
  // Redirect if not logged in
  useEffect(() => {
    if (!customer) {
      navigate('/customer-login');
    }
  }, [customer, navigate]);
  
  // Get orders for this customer
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  
  // Get status badge color and icon
  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return { 
          color: 'bg-blue-100 text-blue-800', 
          icon: <Clock className="h-4 w-4" />,
          text: 'Order Placed'
        };
      case 'packed':
        return { 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: <PackageIcon className="h-4 w-4" />,
          text: 'Packed'
        };
      case 'shipping':
        return { 
          color: 'bg-purple-100 text-purple-800', 
          icon: <TruckIcon className="h-4 w-4" />,
          text: 'Out for Delivery'
        };
      case 'delivered':
        return { 
          color: 'bg-green-100 text-green-800', 
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Delivered'
        };
      case 'cancelled':
        return { 
          color: 'bg-red-100 text-red-800', 
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Cancelled'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800', 
          icon: <Clock className="h-4 w-4" />,
          text: status
        };
    }
  };
  
  if (!customer) {
    return null; // Redirect handled in useEffect
  }
  
  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <header className="container mx-auto max-w-md mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/customer-home')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-agri-primary" />
            <span className="text-lg font-bold">AgriPay</span>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              <span>My Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">No orders yet</h3>
                <p className="text-muted-foreground mb-4">You haven't placed any orders yet</p>
                <Button 
                  onClick={() => navigate('/customer-home')}
                  className="bg-agri-primary hover:bg-agri-secondary"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  
                  return (
                    <div key={order.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Order #{order.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge className={statusInfo.color}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="p-3">
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.name} × {item.quantity}</span>
                              <span>₹{item.price}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Total</span>
                          <span>₹{order.totalAmount}</span>
                        </div>
                      </div>
                      
                      <div className="border-t p-3">
                        <Link to={`/order-tracking/${order.id}`}>
                          <Button variant="outline" className="w-full">
                            <span className="flex items-center gap-1">
                              Track Order
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderHistory;
