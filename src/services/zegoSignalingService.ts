 import { ZIM } from 'zego-zim-web';
 import { supabase } from '@/integrations/supabase/client';
 
 // ZIM Signaling Service for background push notifications
 // This enables incoming call notifications even when the app is in the background
 
 // ZIM connection states (defined locally since types may not be exported)
 const ZIMConnectionState = {
   Disconnected: 0,
   Connecting: 1,
   Connected: 2,
   Reconnecting: 3,
 };
 
 const ZIMConnectionEvent = {
   Success: 0,
   ActiveLogin: 1,
   LoginTimeout: 2,
   Interrupted: 3,
   KickedOut: 4,
 };
 
 interface ZIMConfig {
   appId: number;
   userId: string;
   userName: string;
 }
 
 interface CallInvitationPayload {
   callId: string;
   roomId: string;
   callerId: string;
   callerName: string;
   callerType: 'user' | 'delivery_partner';
 }
 
 type IncomingCallCallback = (payload: CallInvitationPayload) => void;
 
 class ZegoSignalingService {
   private static instance: ZegoSignalingService;
   private zim: any = null;
   private isLoggedIn = false;
   private config: ZIMConfig | null = null;
   private onIncomingCallCallbacks: IncomingCallCallback[] = [];
   private reconnectAttempts = 0;
   private maxReconnectAttempts = 5;
 
   private constructor() {}
 
   static getInstance(): ZegoSignalingService {
     if (!ZegoSignalingService.instance) {
       ZegoSignalingService.instance = new ZegoSignalingService();
     }
     return ZegoSignalingService.instance;
   }
 
   async init(appId: number): Promise<boolean> {
     try {
       if (this.zim) {
         console.log('[ZIM] Already initialized');
         return true;
       }
 
       // Create ZIM instance
       this.zim = ZIM.create({ appID: appId });
       
       if (!this.zim) {
         console.error('[ZIM] Failed to create ZIM instance');
         return false;
       }
 
       // Set up event listeners
       this.setupEventListeners();
       
       console.log('[ZIM] Initialized successfully');
       return true;
     } catch (error) {
       console.error('[ZIM] Init error:', error);
       return false;
     }
   }
 
   private setupEventListeners(): void {
     if (!this.zim) return;
 
   // Connection state changes
   this.zim.on('connectionStateChanged', (zim: any, data: { state: number; event: number }) => {
       console.log('[ZIM] Connection state changed:', data.state, data.event);
       
       if (data.state === ZIMConnectionState.Disconnected) {
         this.isLoggedIn = false;
         
         // Auto-reconnect on disconnect (except for kicked)
         if (data.event !== ZIMConnectionEvent.KickedOut) {
           this.attemptReconnect();
         }
       } else if (data.state === ZIMConnectionState.Connected) {
         this.isLoggedIn = true;
         this.reconnectAttempts = 0;
       }
     });
 
   // Call invitation received (offline push will trigger this when app comes to foreground)
   this.zim.on('callInvitationReceived', (zim: any, data: { callID: string; inviter: string; timeout: number; extendedData: string }) => {
       console.log('[ZIM] Call invitation received:', data);
       
       try {
         const extData = JSON.parse(data.extendedData || '{}');
         const payload: CallInvitationPayload = {
           callId: data.callID,
           roomId: extData.roomId || data.callID,
           callerId: data.inviter,
           callerName: extData.callerName || 'Unknown Caller',
           callerType: extData.callerType || 'delivery_partner',
         };
 
         // Notify all registered callbacks
         this.onIncomingCallCallbacks.forEach(cb => cb(payload));
       } catch (e) {
         console.error('[ZIM] Error parsing call invitation:', e);
       }
     });
 
   // Call invitation cancelled
   this.zim.on('callInvitationCancelled', (zim: any, data: { callID: string; inviter: string; extendedData: string }) => {
       console.log('[ZIM] Call invitation cancelled:', data.callID);
     });
 
   // Call invitation timeout
   this.zim.on('callInvitationTimeout', (zim: any, data: { callID: string }) => {
       console.log('[ZIM] Call invitation timeout:', data.callID);
     });
   }
 
   private async attemptReconnect(): Promise<void> {
     if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.config) {
       console.log('[ZIM] Max reconnect attempts reached or no config');
       return;
     }
 
     this.reconnectAttempts++;
     const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
     
     console.log(`[ZIM] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
     
     await new Promise(resolve => setTimeout(resolve, delay));
     
     if (this.config) {
       await this.login(this.config.userId, this.config.userName);
     }
   }
 
   async login(userId: string, userName: string): Promise<boolean> {
     if (!this.zim) {
       console.error('[ZIM] Not initialized, call init() first');
       return false;
     }
 
     try {
       // Clean userId for ZIM (alphanumeric, max 32 chars)
       const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
       
       if (cleanUserId.length < 2) {
         console.error('[ZIM] Invalid userId');
         return false;
       }
 
       // Get token from server
       const { data, error } = await supabase.functions.invoke('get-zego-token', {
         body: { userId: cleanUserId, roomId: 'zim_auth', userName }
       });
 
       if (error || !data?.token) {
         console.error('[ZIM] Failed to get token:', error);
         // Login without token (some setups allow this)
         await this.zim.login({ userID: cleanUserId, userName }, '');
       } else {
         await this.zim.login({ userID: cleanUserId, userName }, data.token);
       }
 
       this.isLoggedIn = true;
       this.config = { appId: 0, userId: cleanUserId, userName };
       
       console.log('[ZIM] Logged in successfully:', cleanUserId);
       return true;
     } catch (error) {
       console.error('[ZIM] Login error:', error);
       return false;
     }
   }
 
   async logout(): Promise<void> {
     if (!this.zim || !this.isLoggedIn) return;
 
     try {
       await this.zim.logout();
       this.isLoggedIn = false;
       console.log('[ZIM] Logged out');
     } catch (error) {
       console.error('[ZIM] Logout error:', error);
     }
   }
 
   // Send call invitation via ZIM (for background push)
   async sendCallInvitation(
     calleeId: string,
     callId: string,
     roomId: string,
     callerName: string,
     callerType: 'user' | 'delivery_partner',
     timeout: number = 60
   ): Promise<boolean> {
     if (!this.zim || !this.isLoggedIn) {
       console.warn('[ZIM] Not connected, falling back to Supabase broadcast');
       return false;
     }
 
     try {
       // Clean calleeId for ZIM
       const cleanCalleeId = calleeId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
       
       const extendedData = JSON.stringify({
         callId,
         roomId,
         callerName,
         callerType,
       });
 
       const pushConfig = {
         title: '📞 Incoming Call',
         content: `${callerName} is calling...`,
         // resourceID must match the one configured in ZEGOCLOUD console for FCM
         resourcesID: 'zippy_calls',
       };
 
       await this.zim.callInvite([cleanCalleeId], {
         timeout,
         extendedData,
         pushConfig: {
           title: pushConfig.title,
           content: pushConfig.content,
           resourcesID: pushConfig.resourcesID,
         },
       });
 
       console.log('[ZIM] Call invitation sent to:', cleanCalleeId);
       return true;
     } catch (error) {
       console.error('[ZIM] Send call invitation error:', error);
       return false;
     }
   }
 
   async cancelCallInvitation(callId: string, calleeIds: string[]): Promise<void> {
     if (!this.zim || !this.isLoggedIn) return;
 
     try {
       const cleanCalleeIds = calleeIds.map(id => id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32));
       await this.zim.callCancel(cleanCalleeIds, callId, {});
       console.log('[ZIM] Call invitation cancelled');
     } catch (error) {
       console.error('[ZIM] Cancel call invitation error:', error);
     }
   }
 
   async acceptCallInvitation(callId: string): Promise<void> {
     if (!this.zim || !this.isLoggedIn) return;
 
     try {
       await this.zim.callAccept(callId, {});
       console.log('[ZIM] Call invitation accepted');
     } catch (error) {
       console.error('[ZIM] Accept call invitation error:', error);
     }
   }
 
   async rejectCallInvitation(callId: string): Promise<void> {
     if (!this.zim || !this.isLoggedIn) return;
 
     try {
       await this.zim.callReject(callId, {});
       console.log('[ZIM] Call invitation rejected');
     } catch (error) {
       console.error('[ZIM] Reject call invitation error:', error);
     }
   }
 
   onIncomingCall(callback: IncomingCallCallback): () => void {
     this.onIncomingCallCallbacks.push(callback);
     return () => {
       const index = this.onIncomingCallCallbacks.indexOf(callback);
       if (index > -1) {
         this.onIncomingCallCallbacks.splice(index, 1);
       }
     };
   }
 
   isConnected(): boolean {
     return this.isLoggedIn;
   }
 
   destroy(): void {
     if (this.zim) {
       this.zim.destroy();
       this.zim = null;
     }
     this.isLoggedIn = false;
     this.onIncomingCallCallbacks = [];
   }
 }
 
 export const zegoSignalingService = ZegoSignalingService.getInstance();
 export type { CallInvitationPayload, IncomingCallCallback };