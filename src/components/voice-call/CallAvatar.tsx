 import React from 'react';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { cn } from '@/lib/utils';
 
 interface CallAvatarProps {
   name: string;
   imageUrl?: string;
   isAnimating?: boolean;
   size?: 'sm' | 'md' | 'lg';
 }
 
 const CallAvatar = ({ 
   name, 
   imageUrl, 
   isAnimating = false,
   size = 'lg' 
 }: CallAvatarProps) => {
   const sizeClasses = {
     sm: 'h-16 w-16',
     md: 'h-24 w-24',
     lg: 'h-32 w-32',
   };
 
   const ringSizeClasses = {
     sm: 'h-20 w-20',
     md: 'h-32 w-32',
     lg: 'h-40 w-40',
   };
 
   const fontSizeClasses = {
     sm: 'text-2xl',
     md: 'text-4xl',
     lg: 'text-5xl',
   };
 
   return (
     <div className="relative flex items-center justify-center">
       {/* Animated pulse rings */}
       {isAnimating && (
         <>
           <div 
             className={cn(
               "absolute rounded-full bg-white/10 animate-[pulse-ring_2s_ease-out_infinite]",
               ringSizeClasses[size]
             )}
           />
           <div 
             className={cn(
               "absolute rounded-full bg-white/5 animate-[pulse-ring_2s_ease-out_infinite_0.5s]",
               size === 'lg' ? 'h-48 w-48' : size === 'md' ? 'h-40 w-40' : 'h-28 w-28'
             )}
           />
         </>
       )}
       
       {/* Avatar */}
       <Avatar className={cn(
         sizeClasses[size],
         "border-4 border-white/20 shadow-2xl relative z-10"
       )}>
         <AvatarImage src={imageUrl || ''} alt={name} />
         <AvatarFallback 
           className={cn(
             "bg-white/20 text-white font-bold",
             fontSizeClasses[size]
           )}
         >
           {name?.charAt(0)?.toUpperCase() || '?'}
         </AvatarFallback>
       </Avatar>
     </div>
   );
 };
 
 export default CallAvatar;