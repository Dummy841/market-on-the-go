import { useCallback, useEffect, useState } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('Notification permission:', result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Cannot show notification - permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const showOrderStatusNotification = useCallback((status: string, sellerName: string) => {
    const statusMessages: { [key: string]: { title: string; body: string } } = {
      accepted: {
        title: 'Order Accepted! 🎉',
        body: `${sellerName} has accepted your order and will start preparing soon.`,
      },
      preparing: {
        title: 'Preparing Your Order 👨‍🍳',
        body: `${sellerName} is now preparing your delicious food.`,
      },
      packed: {
        title: 'Order Packed! 📦',
        body: `Your order from ${sellerName} is packed and ready for pickup.`,
      },
      assigned: {
        title: 'Delivery Partner Assigned 🛵',
        body: `A delivery partner has been assigned to pick up your order.`,
      },
      going_for_pickup: {
        title: 'Partner On The Way 🏃',
        body: `Your delivery partner is heading to ${sellerName} to pick up your order.`,
      },
      picked_up: {
        title: 'Order Picked Up! 🎁',
        body: `Your order has been picked up from ${sellerName}.`,
      },
      going_for_delivery: {
        title: 'Out for Delivery! 🚀',
        body: `Your food is on its way! Get ready to enjoy your meal.`,
      },
      delivered: {
        title: 'Order Delivered! ✅',
        body: `Enjoy your meal from ${sellerName}! Don't forget to rate your experience.`,
      },
    };

    const message = statusMessages[status];
    if (message) {
      showNotification(message.title, {
        body: message.body,
        tag: `order-status-${status}`,
        requireInteraction: status === 'delivered',
      });
    }
  }, [showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showOrderStatusNotification,
  };
};