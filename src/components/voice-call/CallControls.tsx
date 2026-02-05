 import React from 'react';
 import { Button } from '@/components/ui/button';
 import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface CallControlsProps {
   isIncoming: boolean;
   isOngoing: boolean;
   isMuted: boolean;
   isSpeaker: boolean;
   onAnswer?: () => void;
   onDecline?: () => void;
   onEnd: () => void;
   onToggleMute: () => void;
   onToggleSpeaker: () => void;
 }
 
 const CallControls = ({
   isIncoming,
   isOngoing,
   isMuted,
   isSpeaker,
   onAnswer,
   onDecline,
   onEnd,
   onToggleMute,
   onToggleSpeaker,
 }: CallControlsProps) => {
   // Incoming call - show Answer and Decline
   if (isIncoming) {
     return (
       <div className="flex items-center justify-center gap-16">
         <div className="flex flex-col items-center gap-2">
           <Button
             onClick={onDecline}
           className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
           >
           <PhoneOff className="h-7 w-7 text-destructive-foreground" />
           </Button>
           <span className="text-sm text-white/70">Decline</span>
         </div>
         
         <div className="flex flex-col items-center gap-2">
           <Button
             onClick={onAnswer}
           className="h-16 w-16 rounded-full bg-secondary hover:bg-secondary/90 shadow-lg"
           >
           <Phone className="h-7 w-7 text-secondary-foreground" />
           </Button>
           <span className="text-sm text-white/70">Answer</span>
         </div>
       </div>
     );
   }
 
   // Ongoing or calling - show Mute, End, Speaker
   return (
     <div className="flex items-center justify-center gap-6">
       {/* Mute */}
       <div className="flex flex-col items-center gap-2">
         <Button
           onClick={onToggleMute}
           className={cn(
             "h-14 w-14 rounded-full transition-all",
             isMuted 
               ? "bg-white/30 hover:bg-white/40" 
               : "bg-white/10 hover:bg-white/20"
           )}
           variant="ghost"
         >
           {isMuted ? (
             <MicOff className="h-6 w-6 text-white" />
           ) : (
             <Mic className="h-6 w-6 text-white" />
           )}
         </Button>
         <span className="text-xs text-white/70">
           {isMuted ? 'Unmute' : 'Mute'}
         </span>
       </div>
 
       {/* End Call */}
       <div className="flex flex-col items-center gap-2">
         <Button
           onClick={onEnd}
           className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
         >
           <PhoneOff className="h-7 w-7 text-destructive-foreground" />
         </Button>
         <span className="text-xs text-white/70">End</span>
       </div>
 
       {/* Speaker */}
       <div className="flex flex-col items-center gap-2">
         <Button
           onClick={onToggleSpeaker}
           className={cn(
             "h-14 w-14 rounded-full transition-all",
             isSpeaker 
               ? "bg-white/30 hover:bg-white/40" 
               : "bg-white/10 hover:bg-white/20"
           )}
           variant="ghost"
         >
           {isSpeaker ? (
             <Volume2 className="h-6 w-6 text-white" />
           ) : (
             <VolumeX className="h-6 w-6 text-white" />
           )}
         </Button>
         <span className="text-xs text-white/70">
           {isSpeaker ? 'Speaker' : 'Earpiece'}
         </span>
       </div>
     </div>
   );
 };
 
 export default CallControls;