
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCoupons } from '@/hooks/useCoupons';
import { useTickets } from '@/hooks/useTickets';
import { 
  TrendingUp, 
  Users, 
  Package, 
  IndianRupee,
  ShoppingCart,
  Tag,
  Ticket
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { coupons } = useCoupons();
  const { tickets } = useTickets();

  const handleSalesDashboardClick = () => {
    navigate('/sales-dashboard');
  };

  // Calculate total value of products
  const totalProductValue = products.reduce((total, product) => {
    return total + (product.price_per_unit * product.quantity);
  }, 0);

  const stats = [
    {
      title: "Total Products",
      value: products.length.toString(),
      change: `Value: ₹${totalProductValue.toFixed(2)}`,
      icon: <Package className="h-6 w-6" />
    },
    {
      title: "Total Customers",
      value: customers.length.toString(),
      change: "+New registrations",
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Active Coupons",
      value: coupons.filter(c => c.is_active).length.toString(),
      change: `${coupons.length} total coupons`,
      icon: <Tag className="h-6 w-6" />
    },
    {
      title: "Support Tickets",
      value: tickets.length.toString(),
      change: `${tickets.filter(t => t.status === 'pending').length} pending`,
      icon: <Ticket className="h-6 w-6" />
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to DostanFarms Dashboard</p>
            </div>
            <Button 
              onClick={handleSalesDashboardClick}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sales Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className="text-muted-foreground">
                    {stat.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-green-600">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Products synced with Supabase</p>
                      <p className="text-xs text-muted-foreground">Real-time updates</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Customer data synchronized</p>
                      <p className="text-xs text-muted-foreground">Database connected</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Coupons and tickets ready</p>
                      <p className="text-xs text-muted-foreground">All systems online</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => navigate('/products')}
                  >
                    <Package className="h-6 w-6 mb-2" />
                    <span>Manage Products</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => navigate('/customers')}
                  >
                    <Users className="h-6 w-6 mb-2" />
                    <span>Manage Customers</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={handleSalesDashboardClick}
                  >
                    <ShoppingCart className="h-6 w-6 mb-2" />
                    <span>Start Sale</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => navigate('/coupons')}
                  >
                    <Tag className="h-6 w-6 mb-2" />
                    <span>Manage Coupons</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
