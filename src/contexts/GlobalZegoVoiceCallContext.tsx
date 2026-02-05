import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';
import { useZegoVoiceCall, CallStatus } from '@/hooks/useZegoVoiceCall';
 import IncomingCallOverlay from '@/components/voice-call/IncomingCallOverlay';
import { useEffect, useRef } from 'react';

interface GlobalZegoVoiceCallContextType {
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
   let navigate: ReturnType<typeof useNavigate> | null = null;
   let location: ReturnType<typeof useLocation> | null = null;
   try {
     navigate = useNavigate();
     location = useLocation();
   } catch {
     // Not in router context
   }

  const voiceCall = useZegoVoiceCall({
    myId: user?.id || '',
    myType: 'user',
    myName: user?.name || 'Customer',
  });

   // Track when we've already navigated to avoid double navigation
   const navigatedToCallRef = useRef<string | null>(null);
    // Track if we initiated the call (to know when to navigate)
    const isInitiatorRef = useRef(false);
 
   // Navigate to voice call page when a call becomes active
   useEffect(() => {
     const { status, callId } = voiceCall.state;
     const currentPath = location?.pathname || '';
     const isOnVoiceCallPage = currentPath.startsWith('/voice-call/');
     
      // Only navigate when WE initiated the call (status = 'calling')
      // For incoming calls, we navigate in handleAnswer after user taps Answer
      if (status === 'calling' && callId && navigate && !isOnVoiceCallPage) {
        isInitiatorRef.current = true;
       if (navigatedToCallRef.current !== callId) {
         navigatedToCallRef.current = callId;
         navigate(`/voice-call/${callId}`);
       }
     }
     
     // Reset navigation tracking when call ends
     if (status === 'idle' || status === 'ended' || status === 'declined' || status === 'missed') {
       navigatedToCallRef.current = null;
        isInitiatorRef.current = false;
     }
   }, [voiceCall.state.status, voiceCall.state.callId, navigate, location?.pathname]);
 
    // Handle answering incoming call
    // IMPORTANT: navigate immediately so the /voice-call page mounts and provides the ZEGO container.
    // Without the container, joinRoom may never execute -> one-way/no audio.
    const handleAnswer = useCallback(async () => {
      const callId = voiceCall.state.callId;
      if (callId && navigate) {
        navigatedToCallRef.current = callId;
        try {
          navigate(`/voice-call/${callId}`);
        } catch {
          // ignore
        }
      }
      // Small delay to ensure page is mounted and container is set
      await new Promise(resolve => setTimeout(resolve, 150));
      await voiceCall.answerCall();
    }, [voiceCall, navigate]);
 
  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

    const isIncomingCall = voiceCall.state.status === 'ringing' && 
      voiceCall.state.callerType === 'delivery_partner';

    const incomingCallerName = isIncomingCall
      ? 'Zippy Delivary Partner'
      : (voiceCall.state.callerName || 'Delivery Partner');
 
  return (
    <GlobalZegoVoiceCallContext.Provider value={{
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
       {isIncomingCall && (
         <IncomingCallOverlay
            callerName={incomingCallerName}
           onAnswer={handleAnswer}
           onDecline={voiceCall.declineCall}
         />
       )}
    </GlobalZegoVoiceCallContext.Provider>
  );
};
