
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  TruckIcon, 
  CheckCircle,
  Clock, 
  Package as PackageIcon
} from 'lucide-react';
import { format } from 'date-fns';

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
  estimatedDelivery?: string;
}

// Mock orders data
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
    estimatedDelivery: new Date(2025, 4, 3).toISOString()
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
    trackingInfo: 'TRK789012',
    estimatedDelivery: new Date(2025, 4, 7).toISOString()
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
    estimatedDelivery: new Date(2025, 4, 8).toISOString()
  }
];

const OrderTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  
  useEffect(() => {
    // Get order data
    const foundOrder = mockOrders.find(o => o.id === id);
    setOrder(foundOrder || null);
  }, [id]);
  
  // Get customer data from localStorage
  const customerString = localStorage.getItem('currentCustomer');
  const customer = customerString ? JSON.parse(customerString) : null;
  
  // Redirect if not logged in
  useEffect(() => {
    if (!customer) {
      navigate('/customer-login');
    }
  }, [customer, navigate]);
  
  if (!customer || !order) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">Order not found</h3>
              <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist</p>
              <Button 
                onClick={() => navigate('/order-history')}
                className="bg-agri-primary hover:bg-agri-secondary"
              >
                Go to Order History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Define tracking steps
  const steps = [
    { id: 'placed', label: 'Order Placed', icon: <Clock className="h-5 w-5" /> },
    { id: 'packed', label: 'Packed', icon: <PackageIcon className="h-5 w-5" /> },
    { id: 'shipping', label: 'Out for Delivery', icon: <TruckIcon className="h-5 w-5" /> },
    { id: 'delivered', label: 'Delivered', icon: <CheckCircle className="h-5 w-5" /> }
  ];
  
  // Determine current step
  const getCurrentStepIndex = () => {
    if (order.status === 'cancelled') return -1;
    
    const statusIndices: Record<OrderStatus, number> = {
      placed: 0,
      packed: 1,
      shipping: 2,
      delivered: 3,
      cancelled: -1
    };
    
    return statusIndices[order.status] || 0;
  };
  
  const currentStepIndex = getCurrentStepIndex();
  
  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <header className="container mx-auto max-w-md mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/order-history')}
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
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order #{order.id}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {format(new Date(order.date), 'dd MMM yyyy')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="h-5 w-5" />
              <span>Track Order</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.status === 'cancelled' ? (
              <div className="text-center py-4 text-red-500">
                <p className="font-medium">This order has been cancelled</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Delivery</p>
                  <p className="font-medium">
                    {order.estimatedDelivery ? 
                      format(new Date(order.estimatedDelivery), 'dd MMM yyyy') : 
                      'To be determined'}
                  </p>
                </div>
                
                {order.trackingInfo && (
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Tracking ID</p>
                    <p className="font-medium">{order.trackingInfo}</p>
                  </div>
                )}
                
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-[15px] top-0 h-full w-[2px] bg-muted" />
                  
                  {/* Steps */}
                  <div className="space-y-8 relative">
                    {steps.map((step, index) => {
                      const isComplete = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      
                      return (
                        <div key={step.id} className="flex items-start gap-4 relative">
                          <div 
                            className={`
                              flex items-center justify-center h-8 w-8 rounded-full z-10
                              ${isComplete ? 
                                'bg-green-500 text-white' : 
                                'bg-muted text-muted-foreground'}
                              ${isCurrent ? 'ring-2 ring-green-200' : ''}
                            `}
                          >
                            {step.icon}
                          </div>
                          <div>
                            <p className={`font-medium ${isCurrent ? 'text-green-600' : ''}`}>
                              {step.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isCurrent && order.status === 'shipping' ? 
                                'Your order is on the way' : 
                                isComplete && index === 3 ? 
                                'Your order has been delivered' :
                                index === 0 ? 
                                `Order received on ${format(new Date(order.date), 'dd MMM yyyy')}` :
                                ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderTracking;
