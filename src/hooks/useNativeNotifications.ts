import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleResult, ActionPerformed } from '@capacitor/local-notifications';

interface NotificationOptions {
  title: string;
  body: string;
  id?: number;
  data?: Record<string, any>;
  ongoing?: boolean; // For persistent incoming call notifications
  autoCancel?: boolean;
}

// Callback registry for incoming call actions
const callActionCallbacks: Map<string, (action: 'answer' | 'decline') => void> = new Map();

export const registerCallActionCallback = (callId: string, callback: (action: 'answer' | 'decline') => void) => {
  callActionCallbacks.set(callId, callback);
};

export const unregisterCallActionCallback = (callId: string) => {
  callActionCallbacks.delete(callId);
};

export const useNativeNotifications = () => {
  const permissionGranted = useRef(false);
  const channelCreated = useRef(false);
  const listenersRegistered = useRef(false);

  // Initialize notification channels and permissions
  useEffect(() => {
    const init = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Create notification channel for Android - Order Updates
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

          // Create notification channel for Incoming Calls - MAX priority for lock screen
          await LocalNotifications.createChannel({
            id: 'zippy_calls',
            name: 'Incoming Calls',
            description: 'High-priority notifications for incoming voice calls',
            importance: 5, // MAX importance - shows on lock screen
            visibility: 1, // PUBLIC - shows full content on lock screen
            vibration: true,
            sound: 'ringtone', // Must have ringtone.mp3 in android/app/src/main/res/raw/
            lights: true,
            lightColor: '#FF6B00',
          });
          
          channelCreated.current = true;
          console.log('Notification channels created successfully');
        }

        // Register action types for call notifications
        if (!listenersRegistered.current) {
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: 'INCOMING_CALL',
                actions: [
                  {
                    id: 'ANSWER_CALL',
                    title: '📞 Answer',
                    foreground: true, // Opens app
                  },
                  {
                    id: 'DECLINE_CALL',
                    title: '❌ Decline',
                    destructive: true,
                    foreground: true,
                  },
                ],
              },
            ],
          });

          // Listen for notification action performed
          await LocalNotifications.addListener('localNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Notification action performed:', notification);
            
            const { actionId, notification: notif } = notification;
            const callId = notif.extra?.callId;
            
            if (callId && callActionCallbacks.has(callId)) {
              const callback = callActionCallbacks.get(callId)!;
              if (actionId === 'ANSWER_CALL' || actionId === 'tap') {
                callback('answer');
              } else if (actionId === 'DECLINE_CALL') {
                callback('decline');
              }
            }
          });

          listenersRegistered.current = true;
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
    ongoing = false,
    autoCancel = true,
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
            channelId: ongoing ? 'zippy_calls' : 'zippy_orders',
            sound: ongoing ? 'ringtone' : 'default',
            extra: data,
            smallIcon: 'ic_notification', // Android only
            iconColor: '#FF6B00',
            ongoing, // Makes notification persistent (can't be swiped away)
            autoCancel, // Whether tapping dismisses it
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

  const cancelNotification = useCallback(async (notificationId: number) => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
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

  // Incoming call notification with high-priority full-screen intent behavior
  const showIncomingCallNotification = useCallback(async (
    callerName: string,
    callId: string
  ): Promise<number> => {
    const notificationId = Math.floor(Math.random() * 100000);
    
    if (!Capacitor.isNativePlatform()) {
      // For web, use browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`📞 Incoming Call`, { body: `${callerName} is calling...` });
      }
      return notificationId;
    }
    
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: '📞 Incoming Call',
            body: `${callerName} is calling...`,
            channelId: 'zippy_calls',
            sound: 'ringtone',
            extra: { type: 'incoming_call', callId },
            smallIcon: 'ic_notification',
            iconColor: '#FF6B00',
            ongoing: true,
            autoCancel: false,
            actionTypeId: 'INCOMING_CALL', // Register for action buttons
          },
        ],
      });
      
      console.log('Incoming call notification scheduled with ID:', notificationId);
    } catch (error) {
      console.error('Error showing incoming call notification:', error);
    }

    return notificationId;
  }, []);

  const dismissIncomingCallNotification = useCallback(async (notificationId: number) => {
    await cancelNotification(notificationId);
  }, [cancelNotification]);

  return {
    requestPermission,
    showNativeNotification,
    showOrderStatusNotification,
    showChatNotification,
    showIncomingCallNotification,
    dismissIncomingCallNotification,
    cancelNotification,
    isNative: Capacitor.isNativePlatform(),
  };
};
