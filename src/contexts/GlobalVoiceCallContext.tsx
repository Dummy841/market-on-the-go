import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from './UserAuthContext';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useIncomingCall } from '@/hooks/useIncomingCall';
import VoiceCallModal from '@/components/VoiceCallModal';

interface GlobalVoiceCallContextType {
  // Currently empty - the context just provides the listener
}

const GlobalVoiceCallContext = createContext<GlobalVoiceCallContextType>({});

export const useGlobalVoiceCall = () => useContext(GlobalVoiceCallContext);

interface GlobalVoiceCallProviderProps {
  children: ReactNode;
}

export const GlobalVoiceCallProvider = ({ children }: GlobalVoiceCallProviderProps) => {
  const { user, isAuthenticated } = useUserAuth();
  const [callerInfo, setCallerInfo] = useState<{
    partnerId: string;
    partnerName: string;
    chatId: string | null;
  } | null>(null);

  // Get caller info when receiving a call
  const fetchCallerInfo = useCallback(async (callId: string) => {
    try {
      const { data: call } = await supabase
        .from('voice_calls')
        .select('chat_id, caller_id, caller_type')
        .eq('id', callId)
        .single();

      if (call) {
        // Fetch delivery partner name
        const { data: partner } = await supabase
          .from('delivery_partners')
          .select('name')
          .eq('id', call.caller_id)
          .single();

        setCallerInfo({
          partnerId: call.caller_id,
          partnerName: partner?.name || 'Delivery Partner',
          chatId: call.chat_id,
        });
      }
    } catch (error) {
      console.error('Error fetching caller info:', error);
    }
  }, []);

  // Voice call hook - uses callerInfo when available
  const voiceCall = useVoiceCall({
    chatId: callerInfo?.chatId || null,
    myId: user?.id || '',
    myType: 'user',
    partnerId: callerInfo?.partnerId || '',
    partnerName: callerInfo?.partnerName || 'Delivery Partner',
  });

  // Custom incoming call handler that fetches caller info first
  const handleIncomingCall = useCallback(async (
    callId: string,
    offer: RTCSessionDescriptionInit,
    callerName: string,
    callerType: 'user' | 'delivery_partner'
  ) => {
    console.log('GlobalVoiceCallProvider: Handling incoming call', { callId, callerName, callerType });
    
    // Fetch additional caller info
    await fetchCallerInfo(callId);
    
    // Forward to voiceCall handler
    voiceCall.handleIncomingCall(callId, offer, callerName, callerType);
  }, [fetchCallerInfo, voiceCall]);

  // Listen for incoming calls at app level
  const { dismissActiveNotification } = useIncomingCall({
    chatId: null, // Listen for all calls to this user
    myId: user?.id || '',
    myType: 'user',
    onIncomingCall: handleIncomingCall,
    onAnswerFromNotification: () => {
      // Triggered when user taps Answer on notification
      voiceCall.answerCall();
    },
    onDeclineFromNotification: () => {
      // Triggered when user taps Decline on notification
      voiceCall.declineCall();
    },
  });

  // Reset caller info when call ends
  useEffect(() => {
    if (voiceCall.state.status === 'idle') {
      setCallerInfo(null);
    }
  }, [voiceCall.state.status]);

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  return (
    <GlobalVoiceCallContext.Provider value={{}}>
      {children}
      
      {/* Global Voice Call Modal for Users */}
      <VoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={
          voiceCall.state.callerType === 'delivery_partner'
            ? 'Zippy Delivery Partner'
            : callerInfo?.partnerName || 'Delivery Partner'
        }
        partnerAvatar={null}
        showAvatar={false}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'delivery_partner'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        onClose={() => {}}
      />
    </GlobalVoiceCallContext.Provider>
  );
};
