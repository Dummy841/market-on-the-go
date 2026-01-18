import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (!chatId || !myId) return;

    // Listen to database changes for voice_calls
    const dbChannel = supabase
      .channel(`voice-calls-db-${chatId}-${myId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_calls',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          
          // Only handle calls where we are the receiver and haven't processed this call
          if (call.receiver_id === myId && call.status === 'ringing' && !processedCallsRef.current.has(call.id)) {
            console.log('New incoming call detected from database:', call.id);
            processedCallsRef.current.add(call.id);
            
            // Subscribe to this call's signaling channel to get the offer
            const callChannel = supabase.channel(`call-incoming-${call.id}`);
            
            callChannel
              .on('broadcast', { event: 'offer' }, ({ payload: offerPayload }) => {
                console.log('Received offer for incoming call');
                if (offerPayload.from !== myId) {
                  onIncomingCall(
                    call.id,
                    offerPayload.offer,
                    offerPayload.callerName || 'Unknown',
                    call.caller_type
                  );
                }
                // Unsubscribe after receiving the offer
                supabase.removeChannel(callChannel);
              })
              .subscribe();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
    };
  }, [chatId, myId, myType, onIncomingCall]);
};
