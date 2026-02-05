import React, { createContext, useContext, ReactNode } from 'react';
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
 
   // Navigate to voice call page when a call becomes active
   useEffect(() => {
     const { status, callId } = voiceCall.state;
     const currentPath = location?.pathname || '';
     const isOnVoiceCallPage = currentPath.startsWith('/voice-call/');
     
     // Navigate to voice call page when we start calling or when call becomes ongoing
     if ((status === 'calling' || status === 'ongoing') && callId && navigate && !isOnVoiceCallPage) {
       if (navigatedToCallRef.current !== callId) {
         navigatedToCallRef.current = callId;
         navigate(`/voice-call/${callId}`);
       }
     }
     
     // Reset navigation tracking when call ends
     if (status === 'idle' || status === 'ended' || status === 'declined' || status === 'missed') {
       navigatedToCallRef.current = null;
     }
   }, [voiceCall.state.status, voiceCall.state.callId, navigate, location?.pathname]);
 
   // Handle answering incoming call - navigate to voice call page
   const handleAnswer = async () => {
     await voiceCall.answerCall();
     // Navigation will be handled by the useEffect above when status becomes 'ongoing'
   };
 
  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

   const isIncomingCall = voiceCall.state.status === 'ringing' && 
     voiceCall.state.callerType === 'delivery_partner';
 
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
           callerName={voiceCall.state.callerName || 'Delivery Partner'}
           onAnswer={handleAnswer}
           onDecline={voiceCall.declineCall}
         />
       )}
    </GlobalZegoVoiceCallContext.Provider>
  );
};
