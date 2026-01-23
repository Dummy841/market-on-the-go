import React, { createContext, useContext, ReactNode } from 'react';
import { useUserAuth } from './UserAuthContext';
import { useZegoVoiceCall, CallStatus } from '@/hooks/useZegoVoiceCall';
import ZegoVoiceCallModal from '@/components/ZegoVoiceCallModal';

interface GlobalZegoVoiceCallContextType {
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

const GlobalZegoVoiceCallContext = createContext<GlobalZegoVoiceCallContextType | null>(null);

export const useGlobalZegoVoiceCall = () => {
  const context = useContext(GlobalZegoVoiceCallContext);
  if (!context) {
    throw new Error('useGlobalZegoVoiceCall must be used within GlobalZegoVoiceCallProvider');
  }
  return context;
};

interface GlobalZegoVoiceCallProviderProps {
  children: ReactNode;
}

export const GlobalZegoVoiceCallProvider = ({ children }: GlobalZegoVoiceCallProviderProps) => {
  const { user, isAuthenticated } = useUserAuth();

  const voiceCall = useZegoVoiceCall({
    myId: user?.id || '',
    myType: 'user',
    myName: user?.name || 'Customer',
  });

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  return (
    <GlobalZegoVoiceCallContext.Provider value={{
      startCall: voiceCall.startCall,
      state: voiceCall.state,
    }}>
      {children}
      
      {/* Global Voice Call Modal for Users */}
      <ZegoVoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={voiceCall.state.callerName || 'Delivery Partner'}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'delivery_partner'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        setCallContainer={voiceCall.setCallContainer}
      />
    </GlobalZegoVoiceCallContext.Provider>
  );
};
