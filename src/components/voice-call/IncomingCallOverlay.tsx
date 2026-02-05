 import React from 'react';
 import { Phone, PhoneOff } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import CallAvatar from './CallAvatar';
 
 interface IncomingCallOverlayProps {
   callerName: string;
   callerImage?: string;
   onAnswer: () => void;
   onDecline: () => void;
 }
 
 const IncomingCallOverlay = ({
   callerName,
   callerImage,
   onAnswer,
   onDecline,
 }: IncomingCallOverlayProps) => {
   return (
     <div 
       className="fixed inset-0 z-[9999] flex flex-col items-center justify-between py-16"
       style={{
         background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.99))',
         backdropFilter: 'blur(20px)',
       }}
     >
       {/* Top section - Caller info */}
       <div className="flex flex-col items-center gap-6 mt-12">
         <CallAvatar 
           name={callerName} 
           imageUrl={callerImage}
           isAnimating={true}
           size="lg"
         />
         
         <div className="text-center">
           <h2 className="text-2xl font-semibold text-white">{callerName}</h2>
           <p className="text-white/60 mt-2 text-lg">Incoming voice call...</p>
         </div>
       </div>
 
       {/* Bottom section - Call actions */}
       <div className="flex items-center justify-center gap-20 mb-8">
         <div className="flex flex-col items-center gap-3">
           <Button
             onClick={onDecline}
           className="rounded-full bg-destructive hover:bg-destructive/90 shadow-xl"
             style={{ height: '72px', width: '72px' }}
           >
           <PhoneOff className="h-8 w-8 text-destructive-foreground" />
           </Button>
           <span className="text-white/70 text-sm">Decline</span>
         </div>
         
         <div className="flex flex-col items-center gap-3">
           <Button
             onClick={onAnswer}
           className="rounded-full bg-secondary hover:bg-secondary/90 shadow-xl"
             style={{ height: '72px', width: '72px' }}
           >
           <Phone className="h-8 w-8 text-secondary-foreground" />
           </Button>
           <span className="text-white/70 text-sm">Answer</span>
         </div>
       </div>
     </div>
   );
 };
 
 export default IncomingCallOverlay;