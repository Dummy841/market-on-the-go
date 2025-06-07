
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ArrowLeft, 
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Menu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/utils/types';

const CartPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Get customer data from localStorage
  const customerString = localStorage.getItem('currentCustomer');
  const customer = customerString ? JSON.parse(customerString) : null;
  
  // Load cart from localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('customerCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('customerCart', JSON.stringify(cartItems));
  }, [cartItems]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!customer) {
      navigate('/customer-login');
    }
  }, [customer, navigate]);
  
  if (!customer) {
    return null; // Redirect handled in useEffect
  }
  
  // Functions to update cart
  const increaseQuantity = (productId: string) => {
    setCartItems(prev => 
      prev.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };
  
  const decreaseQuantity = (productId: string) => {
    setCartItems(prev => 
      prev.map(item => 
        item.productId === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };
  
  const removeItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart"
    });
  };
  
  // Calculate subtotal
  const subtotal = cartItems.reduce((total, item) => 
    total + (item.quantity * item.pricePerUnit), 0);
  
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Your cart is empty",
        variant: "destructive"
      });
      return;
    }
    
    navigate('/payment');
  };
  
  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <header className="container mx-auto max-w-md mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/customer-home')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-agri-primary" />
            <span className="text-lg font-bold">AgriPay</span>
          </div>
        </div>
      </header>
      
      {/* Mobile sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-lg p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b pb-4">
                <Package className="h-6 w-6 text-agri-primary" />
                <span className="text-lg font-bold">AgriPay</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto"
                  onClick={() => setMenuOpen(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                className="flex items-center justify-start gap-2"
                onClick={() => {
                  navigate('/customer-home');
                  setMenuOpen(false);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Continue Shopping</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto max-w-md">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Shopping Cart</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Your cart is empty</p>
                <Button 
                  onClick={() => navigate('/customer-home')}
                  className="mt-4 bg-agri-primary hover:bg-agri-secondary"
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {cartItems.map((item) => (
                  <li key={item.productId} className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{item.name}</span>
                      <span>₹{item.pricePerUnit}/{item.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => decreaseQuantity(item.productId)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => increaseQuantity(item.productId)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">₹{item.quantity * item.pricePerUnit}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          {cartItems.length > 0 && (
            <CardFooter className="border-t p-4 flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="font-medium">₹{subtotal}</p>
              </div>
              <Button 
                className="bg-agri-primary hover:bg-agri-secondary"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CartPage;
