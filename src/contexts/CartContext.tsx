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
  getUniqueSellers: () => { seller_id: string; seller_name: string }[];
  getItemsBySeller: () => Record<string, CartItem[]>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Derived values for backward compatibility
  const cartRestaurant = cartItems.length > 0 ? cartItems[0].seller_id : null;
  const cartRestaurantName = cartItems.length > 0 ? cartItems[0].seller_name : null;
  const cartRestaurantLatitude = cartItems.length > 0 ? (cartItems[0].seller_latitude ?? null) : null;
  const cartRestaurantLongitude = cartItems.length > 0 ? (cartItems[0].seller_longitude ?? null) : null;

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try { setCartItems(JSON.parse(storedCart)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'quantity'>) => {
    // Check stock from database
    const { data: dbItem } = await supabase
      .from('items')
      .select('stock_quantity')
      .eq('id', item.id)
      .maybeSingle();

    const stock = dbItem?.stock_quantity ?? 0;
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
  }, [cartItems]);

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

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
  };

  const getTotalPrice = () => cartItems.reduce((total, item) => total + (item.seller_price * item.quantity), 0);
  const getTotalItems = () => cartItems.reduce((total, item) => total + item.quantity, 0);

  const getUniqueSellers = useCallback(() => {
    const seen = new Set<string>();
    return cartItems.filter(item => {
      if (seen.has(item.seller_id)) return false;
      seen.add(item.seller_id);
      return true;
    }).map(item => ({ seller_id: item.seller_id, seller_name: item.seller_name }));
  }, [cartItems]);

  const getItemsBySeller = useCallback(() => {
    const grouped: Record<string, CartItem[]> = {};
    cartItems.forEach(item => {
      if (!grouped[item.seller_id]) grouped[item.seller_id] = [];
      grouped[item.seller_id].push(item);
    });
    return grouped;
  }, [cartItems]);

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
    getUniqueSellers,
    getItemsBySeller,
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
