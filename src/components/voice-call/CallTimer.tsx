 import React from 'react';
 
 interface CallTimerProps {
   duration: number;
   className?: string;
 }
 
 export const formatDuration = (seconds: number): string => {
   const mins = Math.floor(seconds / 60);
   const secs = seconds % 60;
   return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
 };
 
 const CallTimer = ({ duration, className = '' }: CallTimerProps) => {
   return (
     <div className={`text-lg font-medium tracking-wider ${className}`}>
       {formatDuration(duration)}
     </div>
   );
 };
 
 export default CallTimer;