import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from './UserAuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface OrderTrackingContextType {
  activeOrder: any | null;
  setActiveOrder: (order: any) => void;
  clearActiveOrder: () => void;
  refreshOrder: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission;
}

const OrderTrackingContext = createContext<OrderTrackingContextType | undefined>(undefined);

export const OrderTrackingProvider = ({ children }: { children: ReactNode }) => {
  const [activeOrder, setActiveOrderState] = useState<any | null>(null);
  const { user } = useUserAuth();
  const activeOrderIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const { permission, requestPermission, showOrderStatusNotification } = useNotifications();

  const getDisplayStatus = useCallback((order: any) => {
    if (!order) return null;
    if (order.status === 'refunded') return 'refunded';
    if (order.status === 'rejected' || order.seller_status === 'rejected') return 'rejected';
    return order.status;
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    activeOrderIdRef.current = activeOrder?.id || null;
  }, [activeOrder]);

  const loadOrderById = useCallback(async (orderId: string) => {
    try {
      console.log('Loading order by ID:', orderId);
      const { data, error } = await supabase
        .from('orders')
        .select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)')
        .eq('id', orderId)
        .single();

      if (data && !error) {
        const displayStatus = getDisplayStatus(data);

        // Include delivered orders for 30 minutes after delivery, exclude refunded orders
        const activeStatuses = ['pending', 'accepted', 'preparing', 'packed', 'assigned', 'going_for_pickup', 'picked_up', 'going_for_delivery'];
        const isRefunded = data.status === 'refunded';
        const isDeliveredRecently = data.status === 'delivered' && data.delivered_at && 
          (new Date().getTime() - new Date(data.delivered_at).getTime()) < 30 * 60000;
        
        if (!isRefunded && (activeStatuses.includes(data.status) || isDeliveredRecently)) {
          console.log('Setting active order with status:', data.status);
          previousStatusRef.current = displayStatus;
          setActiveOrderState(data);
        } else {
          // Order is no longer active, clear it
          clearActiveOrder();
        }
      } else {
        console.error('Error loading order:', error);
        clearActiveOrder();
      }
    } catch (error) {
      console.error('Error loading order:', error);
      clearActiveOrder();
    }
  }, []);

  const checkForActiveOrders = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'accepted', 'preparing', 'packed', 'assigned', 'going_for_pickup', 'picked_up', 'going_for_delivery'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && !error) {
        console.log('Found active order:', data[0].id, data[0].status);
        setActiveOrderState(data[0]);
        localStorage.setItem('activeOrderId', data[0].id);
      }
    } catch (error) {
      console.error('Error checking for active orders:', error);
    }
  }, [user]);

  const clearActiveOrder = useCallback(() => {
    setActiveOrderState(null);
    activeOrderIdRef.current = null;
    localStorage.removeItem('activeOrderId');
  }, []);

  // Check for active orders on mount
  useEffect(() => {
    if (user) {
      const storedOrderId = localStorage.getItem('activeOrderId');
      if (storedOrderId) {
        loadOrderById(storedOrderId);
      } else {
        checkForActiveOrders();
      }
    }
  }, [user, loadOrderById, checkForActiveOrders]);

  // Set up real-time subscription separately to avoid stale closures
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time order subscription for user:', user.id);
    
    const channel = supabase
      .channel(`order-tracking-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Real-time order update received:', payload);
          const newOrder = payload.new as any;
          const currentOrderId = activeOrderIdRef.current;
          const previousStatus = previousStatusRef.current;
          
          if (newOrder) {
            // If it's the current active order, update it
            if (currentOrderId && newOrder.id === currentOrderId) {
              console.log('Updating active order status to:', newOrder.status);
              
              const displayStatus = getDisplayStatus(newOrder);

              // Show notification if status changed (including seller_status based rejection)
              if (previousStatus && displayStatus && displayStatus !== previousStatus) {
                console.log('Status changed from', previousStatus, 'to', displayStatus);
                showOrderStatusNotification(displayStatus, newOrder.seller_name);
              }
              
              previousStatusRef.current = displayStatus;
              await loadOrderById(newOrder.id);
            }
            // If no active order but this is a new order, set it
            else if (!currentOrderId && payload.eventType === 'INSERT') {
              console.log('New order detected:', newOrder.id);
              previousStatusRef.current = getDisplayStatus(newOrder);
              await loadOrderById(newOrder.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Order tracking subscription status:', status);
      });

    return () => {
      console.log('Cleaning up order tracking subscription');
      supabase.removeChannel(channel);
    };
  }, [user, loadOrderById, showOrderStatusNotification]);

  const setActiveOrder = useCallback((order: any) => {
    setActiveOrderState(order);
    activeOrderIdRef.current = order.id;
    localStorage.setItem('activeOrderId', order.id);
  }, []);

  const refreshOrder = useCallback(async () => {
    const orderId = activeOrderIdRef.current;
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)')
        .eq('id', orderId)
        .single();

      if (data && !error) {
        setActiveOrderState(data);
      }
    } catch (error) {
      console.error('Error refreshing order:', error);
    }
  }, []);

  return (
    <OrderTrackingContext.Provider value={{ 
      activeOrder, 
      setActiveOrder, 
      clearActiveOrder, 
      refreshOrder,
      requestNotificationPermission: requestPermission,
      notificationPermission: permission,
    }}>
      {children}
    </OrderTrackingContext.Provider>
  );
};

export const useOrderTracking = () => {
  const context = useContext(OrderTrackingContext);
  if (context === undefined) {
    throw new Error('useOrderTracking must be used within an OrderTrackingProvider');
  }
  return context;
};
