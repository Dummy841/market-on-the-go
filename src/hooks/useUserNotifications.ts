import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNativeNotifications } from "./useNativeNotifications";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useUserNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showChatNotification, showNativeNotification, isNative } = useNativeNotifications();

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchUnreadCount();
    setLoading(false);

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          fetchUnreadCount();
          
          // Show native notification for chat messages
          if (isNative && newNotification.type === 'chat') {
            showChatNotification(
              'Delivery Partner',
              newNotification.message,
              newNotification.reference_id || undefined
            );
          } else if (isNative && newNotification.type === 'order_status') {
            // Order status notifications are already handled in OrderTrackingContext
          } else if (isNative) {
            // Generic notification
            showNativeNotification({
              title: newNotification.title,
              body: newNotification.message,
              data: { type: newNotification.type, reference_id: newNotification.reference_id },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount, isNative, showChatNotification, showNativeNotification]);

  const sendNotification = async (
    targetUserId: string,
    title: string,
    message: string,
    type: string,
    referenceId?: string
  ) => {
    try {
      const { error } = await supabase.from('user_notifications').insert({
        user_id: targetUserId,
        title,
        message,
        type,
        reference_id: referenceId || null,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    fetchUnreadCount,
    sendNotification,
  };
};
