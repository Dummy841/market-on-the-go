import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useIncomingCall } from '@/hooks/useIncomingCall';
import VoiceCallModal from '@/components/VoiceCallModal';

interface DeliveryPartnerVoiceCallContextType {
  // Empty - just provides the listener
}

const DeliveryPartnerVoiceCallContext = createContext<DeliveryPartnerVoiceCallContextType>({});

export const useDeliveryPartnerVoiceCall = () => useContext(DeliveryPartnerVoiceCallContext);

interface DeliveryPartnerVoiceCallProviderProps {
  partnerId: string;
  partnerName: string;
  children: ReactNode;
}

export const DeliveryPartnerVoiceCallProvider = ({ 
  partnerId, 
  partnerName,
  children 
}: DeliveryPartnerVoiceCallProviderProps) => {
  const [callerInfo, setCallerInfo] = useState<{
    userId: string;
    userName: string;
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
        // Fetch user name
        const { data: user } = await supabase
          .from('users')
          .select('name')
          .eq('id', call.caller_id)
          .single();

        setCallerInfo({
          userId: call.caller_id,
          userName: user?.name || 'Customer',
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
    myId: partnerId,
    myType: 'delivery_partner',
    partnerId: callerInfo?.userId || '',
    partnerName: callerInfo?.userName || 'Customer',
  });

  // Custom incoming call handler that fetches caller info first
  const handleIncomingCall = useCallback(async (
    callId: string,
    offer: RTCSessionDescriptionInit,
    callerName: string,
    callerType: 'user' | 'delivery_partner'
  ) => {
    console.log('DeliveryPartnerVoiceCallProvider: Handling incoming call', { callId, callerName, callerType });
    
    // Fetch additional caller info
    await fetchCallerInfo(callId);
    
    // Forward to voiceCall handler
    voiceCall.handleIncomingCall(callId, offer, callerName, callerType);
  }, [fetchCallerInfo, voiceCall]);

  // Listen for incoming calls at delivery partner dashboard level
  const { dismissActiveNotification } = useIncomingCall({
    chatId: null, // Listen for all calls to this delivery partner
    myId: partnerId,
    myType: 'delivery_partner',
    onIncomingCall: handleIncomingCall,
    onAnswerFromNotification: () => {
      // Triggered when partner taps Answer on notification
      voiceCall.answerCall();
    },
    onDeclineFromNotification: () => {
      // Triggered when partner taps Decline on notification
      voiceCall.declineCall();
    },
  });

  // Reset caller info when call ends
  useEffect(() => {
    if (voiceCall.state.status === 'idle') {
      setCallerInfo(null);
    }
  }, [voiceCall.state.status]);

  return (
    <DeliveryPartnerVoiceCallContext.Provider value={{}}>
      {children}
      
      {/* Global Voice Call Modal for Delivery Partners */}
      <VoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={callerInfo?.userName || 'Customer'}
        partnerAvatar={null}
        showAvatar={false}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'user'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        onClose={() => {}}
      />
    </DeliveryPartnerVoiceCallContext.Provider>
  );
};
