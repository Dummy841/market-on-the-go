import React, { createContext, useContext, useState, useEffect } from 'react';

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
    // Load cart from localStorage
    const storedCart = localStorage.getItem('cart');
    const storedRestaurant = localStorage.getItem('cartRestaurant');
    const storedRestaurantName = localStorage.getItem('cartRestaurantName');
    const storedRestaurantLat = localStorage.getItem('cartRestaurantLatitude');
    const storedRestaurantLng = localStorage.getItem('cartRestaurantLongitude');
    
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch (error) {
        console.error('Error parsing stored cart:', error);
      }
    }
    
    if (storedRestaurant) {
      setCartRestaurant(storedRestaurant);
    }
    
    if (storedRestaurantName) {
      setCartRestaurantName(storedRestaurantName);
    }
    
    if (storedRestaurantLat) {
      setCartRestaurantLatitude(parseFloat(storedRestaurantLat));
    }
    
    if (storedRestaurantLng) {
      setCartRestaurantLongitude(parseFloat(storedRestaurantLng));
    }
  }, []);

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    localStorage.setItem('cart', JSON.stringify(cartItems));
    if (cartRestaurant) {
      localStorage.setItem('cartRestaurant', cartRestaurant);
    } else {
      localStorage.removeItem('cartRestaurant');
    }
    if (cartRestaurantName) {
      localStorage.setItem('cartRestaurantName', cartRestaurantName);
    } else {
      localStorage.removeItem('cartRestaurantName');
    }
    if (cartRestaurantLatitude !== null) {
      localStorage.setItem('cartRestaurantLatitude', cartRestaurantLatitude.toString());
    } else {
      localStorage.removeItem('cartRestaurantLatitude');
    }
    if (cartRestaurantLongitude !== null) {
      localStorage.setItem('cartRestaurantLongitude', cartRestaurantLongitude.toString());
    } else {
      localStorage.removeItem('cartRestaurantLongitude');
    }
  }, [cartItems, cartRestaurant, cartRestaurantName, cartRestaurantLatitude, cartRestaurantLongitude]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    // Check if cart is empty or item is from same restaurant
    if (cartRestaurant && cartRestaurant !== item.seller_id) {
      return;
    }

    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });

    // Set restaurant if this is the first item
    if (!cartRestaurant) {
      setCartRestaurant(item.seller_id);
      setCartRestaurantName(item.seller_name);
      if (item.seller_latitude) setCartRestaurantLatitude(item.seller_latitude);
      if (item.seller_longitude) setCartRestaurantLongitude(item.seller_longitude);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => {
      const newItems = prev.filter(item => item.id !== itemId);
      
      // Clear restaurant if cart becomes empty
      if (newItems.length === 0) {
        setCartRestaurant(null);
        setCartRestaurantName(null);
        setCartRestaurantLatitude(null);
        setCartRestaurantLongitude(null);
      }
      
      return newItems;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setCartRestaurant(null);
    setCartRestaurantName(null);
    setCartRestaurantLatitude(null);
    setCartRestaurantLongitude(null);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.seller_price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

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