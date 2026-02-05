 import React, { useEffect, useRef } from 'react';
 import CallAvatar from './CallAvatar';
 import CallControls from './CallControls';
 import CallTimer from './CallTimer';
 import { CallStatus } from '@/hooks/useZegoVoiceCall';
 
 interface VoiceCallModalProps {
   partnerName: string;
   status: CallStatus;
   duration: number;
   isMuted: boolean;
   isSpeaker: boolean;
   onEnd: () => void;
   onToggleMute: () => void;
   onToggleSpeaker: () => void;
   setCallContainer: (element: HTMLDivElement | null) => void;
 }
 
 const VoiceCallModal = ({
   partnerName,
   status,
   duration,
   isMuted,
   isSpeaker,
   onEnd,
   onToggleMute,
   onToggleSpeaker,
   setCallContainer,
 }: VoiceCallModalProps) => {
   const containerRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     if (containerRef.current) {
       setCallContainer(containerRef.current);
     }
     return () => {
       setCallContainer(null);
     };
   }, [setCallContainer]);
 
   const getStatusText = (): string => {
     switch (status) {
       case 'calling':
         return 'Calling...';
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
 
   const isAnimating = status === 'calling';
   const showTimer = status === 'ongoing';
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
           <CallTimer duration={duration} className="text-primary-foreground/90" />
         ) : (
           <p className="text-primary-foreground/60 text-lg">{getStatusText()}</p>
         )}
       </div>
 
       {/* Center content - Avatar and name */}
       <div className="flex-1 flex flex-col items-center justify-center gap-6">
         <CallAvatar 
           name={partnerName}
           isAnimating={isAnimating}
           size="lg"
         />
         
         <div className="text-center">
           <h2 className="text-2xl font-semibold text-primary-foreground">{partnerName}</h2>
           {!showTimer && (
             <p className="text-primary-foreground/60 mt-2">{getStatusText()}</p>
           )}
         </div>
 
         {/* End status message */}
         {isCallEnded && (
           <p className="text-primary-foreground/50 text-sm mt-4">Closing...</p>
         )}
       </div>
 
       {/* Bottom controls */}
       {!isCallEnded && (
         <div className="pb-12 pt-8 px-4">
           <div 
             className="mx-auto max-w-md rounded-3xl py-6 px-8 bg-primary-foreground/5"
             style={{
               backdropFilter: 'blur(10px)',
             }}
           >
             <CallControls
               isIncoming={false}
               isOngoing={true}
               isMuted={isMuted}
               isSpeaker={isSpeaker}
               onEnd={onEnd}
               onToggleMute={onToggleMute}
               onToggleSpeaker={onToggleSpeaker}
             />
           </div>
         </div>
       )}
 
       {/* Safe area bottom */}
       <div className="h-6 flex-shrink-0" />
     </div>
   );
 };
 
 export default VoiceCallModal;