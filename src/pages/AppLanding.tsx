
import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserCog, ShoppingBag } from 'lucide-react';

const AppLanding = () => {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-8 w-8 text-agri-primary" />
        <span className="text-2xl font-bold">Dostan Farms</span>
      </div>
      
      <h1 className="text-2xl font-bold mb-8 text-center">Welcome To Dostan Farms</h1>
      
      <div className="grid grid-cols-1 gap-6 w-full max-w-md">
        <Link to="/farmer-login" className="w-full">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <User className="h-8 w-8 mr-4 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold">Farmer Login</h2>
                <p className="text-sm text-muted-foreground">Access your farmer dashboard</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/employee-login" className="w-full">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <UserCog className="h-8 w-8 mr-4 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold">Employee Login</h2>
                <p className="text-sm text-muted-foreground">Admin & employee access</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/customer-login" className="w-full">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <ShoppingBag className="h-8 w-8 mr-4 text-purple-600" />
              <div>
                <h2 className="text-lg font-semibold">Customer Login</h2>
                <p className="text-sm text-muted-foreground">Shop products & track orders</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground mb-2">New customer?</p>
          <Link to="/customer-register">
            <Button variant="outline">Register Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AppLanding;
