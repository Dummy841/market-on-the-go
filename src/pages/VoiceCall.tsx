  import React, { useEffect, useRef, useMemo } from 'react';
 import { useParams, useNavigate } from 'react-router-dom';
 import CallAvatar from '@/components/voice-call/CallAvatar';
 import CallControls from '@/components/voice-call/CallControls';
 import CallTimer, { formatDuration } from '@/components/voice-call/CallTimer';
import { useGlobalZegoVoiceCall } from '@/contexts/GlobalZegoVoiceCallContext';
 
 const VoiceCall = () => {
   const { callId } = useParams<{ callId: string }>();
   const navigate = useNavigate();
   const containerRef = useRef<HTMLDivElement>(null);
 
  // Use global voice call context - the call is already active
  const voiceCall = useGlobalZegoVoiceCall();

  const state = voiceCall.state;
   const status = state.status;
   const duration = state.duration;
   const isMuted = state.isMuted;
   const isSpeaker = state.isSpeaker;
    const callerType = state.callerType;
    const rawCallerName = state.callerName || 'Unknown';
    const callerName = callerType === 'delivery_partner' ? 'Zippy Delivary Partner' : rawCallerName;

    // Determine if this is an incoming call that WE received (vs. a call WE initiated)
    // If we are ringing AND the callerType is opposite of what we are, it's incoming.
    // However, callerType in state represents the REMOTE party, so:
    // - For user: if callerType === 'delivery_partner', the partner is calling us
    // - For partner: if callerType === 'user', the user is calling us
    // Since VoiceCall page is used by the USER (GlobalZegoVoiceCallContext), we check:
    // The caller initiated the call and navigated here. So 'ringing' + 'calling' both mean
    // we are the caller. 'ringing' only appears on the callee side via IncomingCallOverlay.
    // Thus on VoiceCall page: status will be 'calling' (we started) or 'ongoing' (connected).
    // We should NEVER see 'ringing' here because incoming calls show IncomingCallOverlay first.
 
   // Set container ref when mounted
   useEffect(() => {
     if (containerRef.current) {
       voiceCall.setCallContainer(containerRef.current);
     }
     return () => {
       voiceCall.setCallContainer(null);
     };
  }, [voiceCall]);
 
   // Navigate back when call ends
   useEffect(() => {
     if (status === 'ended' || status === 'declined' || status === 'missed') {
       const timer = setTimeout(() => {
         navigate(-1);
       }, 2000);
       return () => clearTimeout(timer);
     }
   }, [status, navigate]);
 
   // Navigate back if idle (no active call)
   useEffect(() => {
     if (status === 'idle' && callId) {
       navigate(-1);
     }
   }, [status, callId, navigate]);
 
   const getStatusText = (): string => {
     switch (status) {
       case 'calling':
         return 'Calling...';
       case 'ringing':
         return 'Ringing...';
       case 'ongoing':
         return 'Connected';
       case 'ended':
         return 'Call Ended';
       case 'declined':
         return 'Call Declined';
       case 'missed':
         return 'Missed Call';
       default:
         return '';
     }
   };
 
    // On the VoiceCall page, the user is always the CALLER (we navigate here after startCall).
    // Incoming calls are handled by IncomingCallOverlay first, then navigate here after answering.
    // So we should never show incoming UI on this page.
    const isIncoming = false;
   const isAnimating = status === 'calling' || status === 'ringing';
   const showTimer = status === 'ongoing';
   const showControls = status === 'calling' || status === 'ongoing';
    // Since isIncoming is always false here, we never show answer/decline on this page
    const showAnswerDecline = false;
   const isCallEnded = status === 'ended' || status === 'declined' || status === 'missed';
 
   return (
     <div 
       className="fixed inset-0 z-[9999] flex flex-col"
       style={{
         background: 'linear-gradient(135deg, hsl(var(--call-bg-start) / 0.98), hsl(var(--call-bg-end) / 0.99))',
         backdropFilter: 'blur(20px)',
         minHeight: '100dvh',
       }}
     >
       {/* Hidden ZEGO container for audio */}
       <div 
         ref={containerRef}
         className="absolute opacity-0 pointer-events-none"
         style={{ width: 1, height: 1 }}
       />
 
       {/* Safe area top */}
       <div className="h-12 flex-shrink-0" />
 
       {/* Status/Timer at top */}
       <div className="flex flex-col items-center pt-4 pb-8">
         {showTimer ? (
           <CallTimer duration={duration} className="text-white/90" />
         ) : (
           <p className="text-white/60 text-lg">{getStatusText()}</p>
         )}
       </div>
 
       {/* Center content - Avatar and name */}
       <div className="flex-1 flex flex-col items-center justify-center gap-6">
         <CallAvatar 
           name={callerName}
           isAnimating={isAnimating}
           size="lg"
         />
         
         <div className="text-center">
           <h2 className="text-2xl font-semibold text-white">{callerName}</h2>
           {!showTimer && (
             <p className="text-white/60 mt-2">{getStatusText()}</p>
           )}
         </div>
 
         {/* End status message */}
         {isCallEnded && (
           <p className="text-white/50 text-sm mt-4">Returning...</p>
         )}
       </div>
 
       {/* Bottom controls */}
       <div className="pb-12 pt-8 px-4">
         {(showControls || showAnswerDecline) && (
           <div 
             className="mx-auto max-w-md rounded-3xl py-6 px-8"
             style={{
               background: 'rgba(255, 255, 255, 0.05)',
               backdropFilter: 'blur(10px)',
             }}
           >
             <CallControls
               isIncoming={showAnswerDecline}
               isOngoing={showControls}
               isMuted={isMuted}
               isSpeaker={isSpeaker}
               onAnswer={() => voiceCall.answerCall()}
               onDecline={() => voiceCall.declineCall()}
               onEnd={() => voiceCall.endCall()}
               onToggleMute={() => voiceCall.toggleMute()}
               onToggleSpeaker={() => voiceCall.toggleSpeaker()}
             />
           </div>
         )}
       </div>
 
       {/* Safe area bottom */}
       <div className="h-6 flex-shrink-0" />
     </div>
   );
 };
 
 export default VoiceCall;