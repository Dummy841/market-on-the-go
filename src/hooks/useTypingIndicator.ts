import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTypingIndicatorProps {
  chatId: string | null;
  myType: 'user' | 'delivery_partner';
}

export const useTypingIndicator = ({ chatId, myType }: UseTypingIndicatorProps) => {
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Broadcast typing status with debounce
  const sendTyping = useCallback(() => {
    if (!chatId || !channelRef.current) return;
    
    const now = Date.now();
    // Only send every 1 second max
    if (now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_type: myType,
        typing: true,
      },
    });

    // Clear typing after 3 seconds of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_type: myType,
            typing: false,
          },
        });
      }
    }, 3000);
  }, [chatId, myType]);

  // Subscribe to typing channel
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase.channel(`typing-${chatId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        // Only show typing from the other party
        if (payload.user_type !== myType) {
          setIsPartnerTyping(payload.typing);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, myType]);

  return {
    isPartnerTyping,
    sendTyping,
  };
};
