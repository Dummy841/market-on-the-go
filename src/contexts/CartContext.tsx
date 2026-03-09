import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  item_name: string;
  seller_price: number;
  item_photo_url: string | null;
  quantity: number;
  seller_id: string;
  seller_name: string;
  seller_latitude?: number;
  seller_longitude?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartRestaurant: string | null;
  cartRestaurantName: string | null;
  cartRestaurantLatitude: number | null;
  cartRestaurantLongitude: number | null;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartRestaurant, setCartRestaurant] = useState<string | null>(null);
  const [cartRestaurantName, setCartRestaurantName] = useState<string | null>(null);
  const [cartRestaurantLatitude, setCartRestaurantLatitude] = useState<number | null>(null);
  const [cartRestaurantLongitude, setCartRestaurantLongitude] = useState<number | null>(null);

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    const storedRestaurant = localStorage.getItem('cartRestaurant');
    const storedRestaurantName = localStorage.getItem('cartRestaurantName');
    const storedRestaurantLat = localStorage.getItem('cartRestaurantLatitude');
    const storedRestaurantLng = localStorage.getItem('cartRestaurantLongitude');
    
    if (storedCart) {
      try { setCartItems(JSON.parse(storedCart)); } catch { /* ignore */ }
    }
    if (storedRestaurant) setCartRestaurant(storedRestaurant);
    if (storedRestaurantName) setCartRestaurantName(storedRestaurantName);
    if (storedRestaurantLat) setCartRestaurantLatitude(parseFloat(storedRestaurantLat));
    if (storedRestaurantLng) setCartRestaurantLongitude(parseFloat(storedRestaurantLng));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
    if (cartRestaurant) localStorage.setItem('cartRestaurant', cartRestaurant);
    else localStorage.removeItem('cartRestaurant');
    if (cartRestaurantName) localStorage.setItem('cartRestaurantName', cartRestaurantName);
    else localStorage.removeItem('cartRestaurantName');
    if (cartRestaurantLatitude !== null) localStorage.setItem('cartRestaurantLatitude', cartRestaurantLatitude.toString());
    else localStorage.removeItem('cartRestaurantLatitude');
    if (cartRestaurantLongitude !== null) localStorage.setItem('cartRestaurantLongitude', cartRestaurantLongitude.toString());
    else localStorage.removeItem('cartRestaurantLongitude');
  }, [cartItems, cartRestaurant, cartRestaurantName, cartRestaurantLatitude, cartRestaurantLongitude]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'quantity'>) => {
    // Multi-seller check
    if (cartRestaurant && cartRestaurant !== item.seller_id) {
      return;
    }

    // Check stock from database
    const { data: dbItem } = await supabase
      .from('items')
      .select('stock_quantity')
      .eq('id', item.id)
      .maybeSingle();

    const stock = dbItem?.stock_quantity ?? 0;

    // Get current quantity in cart for this item
    const currentInCart = cartItems.find(c => c.id === item.id)?.quantity ?? 0;
    const requestedTotal = currentInCart + 1;

    if (stock === 0) {
      toast({ variant: 'destructive', title: 'Out of Stock', description: `"${item.item_name}" is currently out of stock.` });
      return;
    }

    if (requestedTotal > stock) {
      toast({ variant: 'destructive', title: 'Limited Stock', description: `Only ${stock} qty available for "${item.item_name}".` });
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });

    if (!cartRestaurant) {
      setCartRestaurant(item.seller_id);
      setCartRestaurantName(item.seller_name);
      if (item.seller_latitude) setCartRestaurantLatitude(item.seller_latitude);
      if (item.seller_longitude) setCartRestaurantLongitude(item.seller_longitude);
    }
  }, [cartRestaurant, cartItems]);

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => {
      const newItems = prev.filter(item => item.id !== itemId);
      if (newItems.length === 0) {
        setCartRestaurant(null);
        setCartRestaurantName(null);
        setCartRestaurantLatitude(null);
        setCartRestaurantLongitude(null);
      }
      return newItems;
    });
  };

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    // Check stock
    const { data: dbItem } = await supabase
      .from('items')
      .select('stock_quantity, item_name')
      .eq('id', itemId)
      .maybeSingle();

    const stock = dbItem?.stock_quantity ?? 0;

    if (stock === 0) {
      toast({ variant: 'destructive', title: 'Out of Stock', description: `"${dbItem?.item_name || 'Item'}" is currently out of stock.` });
      removeFromCart(itemId);
      return;
    }

    if (quantity > stock) {
      toast({ variant: 'destructive', title: 'Limited Stock', description: `Only ${stock} qty available for "${dbItem?.item_name || 'Item'}".` });
      setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: stock } : item));
      return;
    }

    setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity } : item));
  }, []);

  const clearCart = () => {
    setCartItems([]);
    setCartRestaurant(null);
    setCartRestaurantName(null);
    setCartRestaurantLatitude(null);
    setCartRestaurantLongitude(null);
  };

  const getTotalPrice = () => cartItems.reduce((total, item) => total + (item.seller_price * item.quantity), 0);
  const getTotalItems = () => cartItems.reduce((total, item) => total + item.quantity, 0);

  const value = {
    cartItems,
    cartRestaurant,
    cartRestaurantName,
    cartRestaurantLatitude,
    cartRestaurantLongitude,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
