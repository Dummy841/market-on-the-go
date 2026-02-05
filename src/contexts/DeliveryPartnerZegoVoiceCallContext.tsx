import React, { createContext, useContext, ReactNode } from 'react';
import { useZegoVoiceCall, CallStatus } from '@/hooks/useZegoVoiceCall';
 import IncomingCallOverlay from '@/components/voice-call/IncomingCallOverlay';
 import VoiceCallModal from '@/components/voice-call/VoiceCallModal';
  import { useCallback, useRef, useEffect } from 'react';

interface DeliveryPartnerZegoVoiceCallContextType {
  startCall: (options: {
    receiverId: string;
    receiverName: string;
    chatId: string;
  }) => Promise<void>;
   answerCall: () => Promise<void>;
   declineCall: () => Promise<void>;
   endCall: () => Promise<void>;
   toggleMute: () => void;
   toggleSpeaker: () => void;
   setCallContainer: (element: HTMLDivElement | null) => void;
  state: {
    status: CallStatus;
    callId: string | null;
    duration: number;
    isMuted: boolean;
    isSpeaker: boolean;
    callerType: 'user' | 'delivery_partner' | null;
    callerName: string | null;
  };
}

const DeliveryPartnerZegoVoiceCallContext = createContext<DeliveryPartnerZegoVoiceCallContextType | null>(null);

export const useDeliveryPartnerZegoVoiceCall = () => {
  const context = useContext(DeliveryPartnerZegoVoiceCallContext);
  if (!context) {
    throw new Error('useDeliveryPartnerZegoVoiceCall must be used within DeliveryPartnerZegoVoiceCallProvider');
  }
  return context;
};

interface DeliveryPartnerZegoVoiceCallProviderProps {
  partnerId: string;
  partnerName: string;
  children: ReactNode;
}

export const DeliveryPartnerZegoVoiceCallProvider = ({ 
  partnerId, 
  partnerName,
  children 
}: DeliveryPartnerZegoVoiceCallProviderProps) => {
  const voiceCall = useZegoVoiceCall({
    myId: partnerId,
    myType: 'delivery_partner',
    myName: partnerName,
  });

    // Track if we've answered to prevent double-answer
    const answeredRef = useRef(false);
 
    // Handle answering with delay for container to be ready
    const handleAnswer = useCallback(async () => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      
      // Small delay to ensure modal renders and container is set
      await new Promise(resolve => setTimeout(resolve, 150));
      await voiceCall.answerCall();
    }, [voiceCall]);
 
    // Reset answered ref when call ends
    const isCallEnded = voiceCall.state.status === 'ended' || 
      voiceCall.state.status === 'declined' || 
      voiceCall.state.status === 'missed' ||
      voiceCall.state.status === 'idle';
    
    useEffect(() => {
      if (isCallEnded && answeredRef.current) {
        answeredRef.current = false;
      }
    }, [isCallEnded]);
 
   const isIncomingCall = voiceCall.state.status === 'ringing' && 
     voiceCall.state.callerType === 'user';
 
   const isActiveCall = voiceCall.state.status === 'calling' || 
      voiceCall.state.status === 'ongoing' ||
      (voiceCall.state.status === 'ringing' && answeredRef.current);
 
  return (
    <DeliveryPartnerZegoVoiceCallContext.Provider value={{
      startCall: voiceCall.startCall,
       answerCall: voiceCall.answerCall,
       declineCall: voiceCall.declineCall,
       endCall: voiceCall.endCall,
       toggleMute: voiceCall.toggleMute,
       toggleSpeaker: voiceCall.toggleSpeaker,
       setCallContainer: voiceCall.setCallContainer,
      state: voiceCall.state,
    }}>
      {children}
      
       {/* Incoming Call Overlay - shows when receiving a call */}
        {isIncomingCall && !answeredRef.current && (
         <IncomingCallOverlay
           callerName={voiceCall.state.callerName || 'Customer'}
            onAnswer={handleAnswer}
           onDecline={voiceCall.declineCall}
         />
       )}
 
       {/* Active Call Modal for ongoing/calling states */}
       {isActiveCall && (
         <VoiceCallModal
           partnerName={voiceCall.state.callerName || 'Customer'}
           status={voiceCall.state.status}
           duration={voiceCall.state.duration}
           isMuted={voiceCall.state.isMuted}
           isSpeaker={voiceCall.state.isSpeaker}
           onEnd={voiceCall.endCall}
           onToggleMute={voiceCall.toggleMute}
           onToggleSpeaker={voiceCall.toggleSpeaker}
           setCallContainer={voiceCall.setCallContainer}
         />
       )}
    </DeliveryPartnerZegoVoiceCallContext.Provider>
  );
};
