import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNativeNotifications } from "./useNativeNotifications";

interface UseIncomingCallProps {
  chatId: string | null;
  myId: string;
  myType: 'user' | 'delivery_partner';
  onIncomingCall: (callId: string, offer: RTCSessionDescriptionInit, callerName: string, callerType: 'user' | 'delivery_partner') => void;
}

export const useIncomingCall = ({
  chatId,
  myId,
  myType,
  onIncomingCall,
}: UseIncomingCallProps) => {
  const processedCallsRef = useRef<Set<string>>(new Set());
  const activeNotificationIdRef = useRef<number | null>(null);
  const { showIncomingCallNotification, dismissIncomingCallNotification, isNative } = useNativeNotifications();

  // Dismiss any active incoming call notification
  const dismissActiveNotification = useCallback(async () => {
    if (activeNotificationIdRef.current !== null) {
      await dismissIncomingCallNotification(activeNotificationIdRef.current);
      activeNotificationIdRef.current = null;
    }
  }, [dismissIncomingCallNotification]);

  useEffect(() => {
    if (!myId) return;

    console.log('useIncomingCall: Setting up listener for myId:', myId, 'myType:', myType, 'chatId:', chatId);

    // Listen to database changes for voice_calls - listen for calls where I am the receiver
    // We use receiver_id filter to catch ALL incoming calls regardless of chatId
    const dbChannel = supabase
      .channel(`voice-calls-receiver-${myId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_calls',
          filter: `receiver_id=eq.${myId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          
          console.log('Incoming call INSERT detected:', call);
          
          // Only handle calls where we are the receiver and haven't processed this call
          if (call.status === 'ringing' && !processedCallsRef.current.has(call.id)) {
            console.log('New incoming call detected from database:', call.id);
            processedCallsRef.current.add(call.id);
            
            // Subscribe to this call's signaling channel to get the offer
            const callChannel = supabase.channel(`call-${call.id}`);
            
            callChannel
              .on('broadcast', { event: 'offer' }, async ({ payload: offerPayload }) => {
                console.log('Received offer for incoming call:', offerPayload);
                if (offerPayload.from !== myId) {
                  const callerName = offerPayload.callerName || 'Unknown';
                  
                  // Show native notification for Android background/locked screen
                  if (isNative) {
                    const notificationId = await showIncomingCallNotification(callerName, call.id);
                    activeNotificationIdRef.current = notificationId;
                  }

                  onIncomingCall(
                    call.id,
                    offerPayload.offer,
                    callerName,
                    call.caller_type
                  );
                }
              })
              .subscribe((status) => {
                console.log('Call channel subscription status:', status);
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_calls',
          filter: `receiver_id=eq.${myId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          
          console.log('Call UPDATE detected:', call);
          
          // Dismiss notification when call is answered, declined, or ended
          if (['connected', 'declined', 'ended', 'missed'].includes(call.status)) {
            await dismissActiveNotification();
          }
        }
      )
      .subscribe((status) => {
        console.log('Incoming call DB channel subscription status:', status);
      });

    return () => {
      console.log('useIncomingCall: Cleaning up listener for myId:', myId);
      supabase.removeChannel(dbChannel);
      dismissActiveNotification();
    };
  }, [myId, myType, onIncomingCall, isNative, showIncomingCallNotification, dismissActiveNotification]);

  return {
    dismissActiveNotification,
  };
};
