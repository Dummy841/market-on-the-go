
import React, { useState } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Sidebar from '@/components/Sidebar';
import { useProducts, Product } from '@/hooks/useProducts';
import { Search, Package, ShoppingCart, Trash2, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SalesDashboardContent = () => {
  const { toast } = useToast();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { products, loading } = useProducts();
  const [cart, setCart] = useState<Array<{product: Product, quantity: number}>>([]);

  // Close sidebar automatically when component mounts
  React.useEffect(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    console.log('Adding product to cart:', product);
    const existingItemIndex = cart.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
      toast({
        title: "Updated cart",
        description: `${product.name} quantity updated in cart`,
      });
    } else {
      setCart([...cart, { product, quantity: 1 }]);
      toast({
        title: "Added to cart",
        description: `${product.name} added to cart`,
      });
    }
  };

  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }
    
    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    setCart(updatedCart);
  };

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price_per_unit * item.quantity), 0);
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to cart before checkout",
        variant: "destructive"
      });
      return;
    }

    // Convert cart to the format expected by PaymentPage
    const cartItems = cart.map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price_per_unit,
      quantity: item.quantity
    }));

    const total = calculateTotal();

    // Navigate to payment page with cart data
    navigate('/payment', {
      state: {
        cartItems,
        total
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="text-center py-12">
            <div className="text-muted-foreground text-lg">Loading products...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Sales Dashboard</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-6 h-full">
          {/* Products Section */}
          <div className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No products found</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm ? 'No products match your search criteria' : 'No products available for sale'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow w-full max-w-[200px] flex flex-col"
                  >
                    <CardHeader className="bg-muted pb-1 px-3 py-2">
                      <CardTitle className="text-sm font-medium truncate">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 px-3 pb-2 flex flex-col justify-between flex-1">
                      <div className="space-y-1 mb-2">
                        <div className="text-xs text-muted-foreground">
                          {product.quantity} {product.unit}
                        </div>
                        <div className="text-sm font-semibold">₹{product.price_per_unit}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 mt-auto"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="w-80 min-w-[320px]">
            <Card className="h-fit sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div key={`${item.product.id}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.product.name}</h4>
                            <p className="text-xs text-muted-foreground">₹{item.product.price_per_unit} per {item.product.unit}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                              className="h-7 w-7 p-0"
                            >
                              -
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                              className="h-7 w-7 p-0"
                            >
                              +
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(index)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={clearCart}>
                          Clear Cart
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={handleCheckout}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Checkout
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const SalesDashboard = () => {
  return (
    <SidebarProvider>
      <SalesDashboardContent />
    </SidebarProvider>
  );
};

export default SalesDashboard;
