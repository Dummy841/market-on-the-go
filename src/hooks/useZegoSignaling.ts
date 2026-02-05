 import { useEffect, useRef, useCallback, useState } from 'react';
 import { zegoSignalingService, CallInvitationPayload } from '@/services/zegoSignalingService';
 import { supabase } from '@/integrations/supabase/client';
 
 interface UseZegoSignalingProps {
   userId: string;
   userName: string;
   onIncomingCall?: (payload: CallInvitationPayload) => void;
 }
 
 interface UseZegoSignalingReturn {
   isConnected: boolean;
   sendCallInvitation: (
     calleeId: string,
     callId: string,
     roomId: string,
     callerName: string,
     callerType: 'user' | 'delivery_partner'
   ) => Promise<boolean>;
   cancelCallInvitation: (callId: string, calleeIds: string[]) => Promise<void>;
   acceptCallInvitation: (callId: string) => Promise<void>;
   rejectCallInvitation: (callId: string) => Promise<void>;
 }
 
 export const useZegoSignaling = ({
   userId,
   userName,
   onIncomingCall,
 }: UseZegoSignalingProps): UseZegoSignalingReturn => {
   const [isConnected, setIsConnected] = useState(false);
   const initAttemptedRef = useRef(false);
   const unsubscribeRef = useRef<(() => void) | null>(null);
 
   // Initialize ZIM and login
   useEffect(() => {
     if (!userId || initAttemptedRef.current) return;
     initAttemptedRef.current = true;
 
     const initZIM = async () => {
       try {
         // Get ZEGO credentials from server
         const { data, error } = await supabase.functions.invoke('get-zego-token', {
           body: { userId, roomId: 'zim_init', userName }
         });
 
         if (error || !data?.appId) {
           console.warn('[ZIM Hook] Failed to get ZEGO credentials:', error);
           return;
         }
 
         // Initialize ZIM service
         const initialized = await zegoSignalingService.init(data.appId);
         if (!initialized) {
           console.warn('[ZIM Hook] Failed to initialize ZIM');
           return;
         }
 
         // Login
         const loggedIn = await zegoSignalingService.login(userId, userName);
         setIsConnected(loggedIn);
 
         if (loggedIn) {
           console.log('[ZIM Hook] Connected and logged in');
         }
       } catch (e) {
         console.error('[ZIM Hook] Init error:', e);
       }
     };
 
     initZIM();
 
     return () => {
       // Don't destroy on unmount - keep ZIM alive for background push
       // zegoSignalingService.destroy();
     };
   }, [userId, userName]);
 
   // Register incoming call callback
   useEffect(() => {
     if (!onIncomingCall) return;
 
     unsubscribeRef.current = zegoSignalingService.onIncomingCall(onIncomingCall);
 
     return () => {
       if (unsubscribeRef.current) {
         unsubscribeRef.current();
         unsubscribeRef.current = null;
       }
     };
   }, [onIncomingCall]);
 
   const sendCallInvitation = useCallback(
     async (
       calleeId: string,
       callId: string,
       roomId: string,
       callerName: string,
       callerType: 'user' | 'delivery_partner'
     ): Promise<boolean> => {
       return zegoSignalingService.sendCallInvitation(
         calleeId,
         callId,
         roomId,
         callerName,
         callerType
       );
     },
     []
   );
 
   const cancelCallInvitation = useCallback(
     async (callId: string, calleeIds: string[]): Promise<void> => {
       await zegoSignalingService.cancelCallInvitation(callId, calleeIds);
     },
     []
   );
 
   const acceptCallInvitation = useCallback(async (callId: string): Promise<void> => {
     await zegoSignalingService.acceptCallInvitation(callId);
   }, []);
 
   const rejectCallInvitation = useCallback(async (callId: string): Promise<void> => {
     await zegoSignalingService.rejectCallInvitation(callId);
   }, []);
 
   return {
     isConnected,
     sendCallInvitation,
     cancelCallInvitation,
     acceptCallInvitation,
     rejectCallInvitation,
   };
 };