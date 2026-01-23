import React, { createContext, useContext, ReactNode } from 'react';
import { useZegoVoiceCall, CallStatus } from '@/hooks/useZegoVoiceCall';
import ZegoVoiceCallModal from '@/components/ZegoVoiceCallModal';

interface DeliveryPartnerZegoVoiceCallContextType {
  startCall: (options: {
    receiverId: string;
    receiverName: string;
    chatId: string;
  }) => Promise<void>;
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

  return (
    <DeliveryPartnerZegoVoiceCallContext.Provider value={{
      startCall: voiceCall.startCall,
      state: voiceCall.state,
    }}>
      {children}
      
      {/* Global Voice Call Modal for Delivery Partners */}
      <ZegoVoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={voiceCall.state.callerName || 'Customer'}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'user'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        setCallContainer={voiceCall.setCallContainer}
      />
    </DeliveryPartnerZegoVoiceCallContext.Provider>
  );
};
