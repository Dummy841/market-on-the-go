import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleResult } from '@capacitor/local-notifications';

interface NotificationOptions {
  title: string;
  body: string;
  id?: number;
  data?: Record<string, any>;
}

export const useNativeNotifications = () => {
  const permissionGranted = useRef(false);
  const channelCreated = useRef(false);

  // Initialize notification channel and permissions
  useEffect(() => {
    const init = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Create notification channel for Android
        if (Capacitor.getPlatform() === 'android' && !channelCreated.current) {
          await LocalNotifications.createChannel({
            id: 'zippy_orders',
            name: 'Order Updates',
            description: 'Notifications for order status and chat messages',
            importance: 5, // HIGH importance
            visibility: 1, // PUBLIC
            vibration: true,
            sound: 'default',
            lights: true,
            lightColor: '#FF6B00',
          });
          channelCreated.current = true;
        }

        // Request permission
        const status = await LocalNotifications.checkPermissions();
        if (status.display === 'granted') {
          permissionGranted.current = true;
        } else if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
          const result = await LocalNotifications.requestPermissions();
          permissionGranted.current = result.display === 'granted';
        }
      } catch (error) {
        console.error('Error initializing native notifications:', error);
      }
    };

    init();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const result = await LocalNotifications.requestPermissions();
      permissionGranted.current = result.display === 'granted';
      return permissionGranted.current;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const showNativeNotification = useCallback(async ({
    title,
    body,
    id,
    data,
  }: NotificationOptions): Promise<ScheduleResult | null> => {
    // If not on native platform, fall back to browser notifications
    if (!Capacitor.isNativePlatform()) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return null;
    }

    try {
      // Generate unique ID if not provided
      const notificationId = id || Math.floor(Math.random() * 100000);

      const result = await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            channelId: 'zippy_orders',
            sound: 'default',
            extra: data,
            smallIcon: 'ic_notification', // Android only
            iconColor: '#FF6B00',
          },
        ],
      });

      console.log('Native notification scheduled:', result);
      return result;
    } catch (error) {
      console.error('Error showing native notification:', error);
      return null;
    }
  }, []);

  const showOrderStatusNotification = useCallback(async (
    status: string,
    sellerName: string,
    orderId?: string
  ) => {
    const statusMessages: Record<string, { title: string; body: string }> = {
      pending: {
        title: '🍽️ Order Placed!',
        body: `Your order from ${sellerName} has been placed successfully.`,
      },
      accepted: {
        title: '✅ Order Accepted!',
        body: `${sellerName} has accepted your order and is preparing it.`,
      },
      preparing: {
        title: '👨‍🍳 Order Being Prepared',
        body: `${sellerName} is preparing your delicious food.`,
      },
      packed: {
        title: '📦 Order Packed!',
        body: `Your order from ${sellerName} is packed and ready for pickup.`,
      },
      assigned: {
        title: '🚴 Delivery Partner Assigned',
        body: `A delivery partner has been assigned for your order.`,
      },
      going_for_pickup: {
        title: '🏃 On The Way to Pickup',
        body: `Delivery partner is heading to ${sellerName} to pick up your order.`,
      },
      picked_up: {
        title: '📍 Order Picked Up',
        body: `Your order has been picked up from ${sellerName}.`,
      },
      going_for_delivery: {
        title: '🚚 Out for Delivery!',
        body: `Your order from ${sellerName} is on its way to you.`,
      },
      delivered: {
        title: '🎉 Order Delivered!',
        body: `Enjoy your food from ${sellerName}! Don't forget to rate.`,
      },
      rejected: {
        title: '❌ Order Rejected',
        body: `Sorry, ${sellerName} couldn't accept your order. Refund will be processed.`,
      },
      refunded: {
        title: '💰 Refund Processed',
        body: `Your refund for the order from ${sellerName} has been processed.`,
      },
    };

    const message = statusMessages[status];
    if (message) {
      await showNativeNotification({
        title: message.title,
        body: message.body,
        data: { orderId, status },
      });
    }
  }, [showNativeNotification]);

  const showChatNotification = useCallback(async (
    senderName: string,
    message: string,
    orderId?: string
  ) => {
    await showNativeNotification({
      title: `💬 Message from ${senderName}`,
      body: message.length > 100 ? message.substring(0, 97) + '...' : message,
      data: { type: 'chat', orderId },
    });
  }, [showNativeNotification]);

  return {
    requestPermission,
    showNativeNotification,
    showOrderStatusNotification,
    showChatNotification,
    isNative: Capacitor.isNativePlatform(),
  };
};
