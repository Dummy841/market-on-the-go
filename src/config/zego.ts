 // ZEGO Configuration Constants
 // All ZEGO-related settings centralized here
 
 export const ZEGO_CONFIG = {
   // Call timeout in milliseconds (30 seconds)
   CALL_TIMEOUT_MS: 30000,
   
   // Maximum call ID length (ZEGO requirement)
   MAX_CALL_ID_LENGTH: 32,
   
   // Audio-only call settings
   AUDIO_ONLY: {
     turnOnCameraWhenJoining: false,
     turnOnMicrophoneWhenJoining: true,
     showMyCameraToggleButton: false,
     showScreenSharingButton: false,
     showPreJoinView: false,
   },
 };
 
 // Generate a unique, ZEGO-compliant room ID
 export const generateRoomId = (chatId: string): string => {
   const timestamp = Date.now().toString(36);
   const cleanChatId = chatId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
   return `c_${cleanChatId}_${timestamp}`.slice(0, ZEGO_CONFIG.MAX_CALL_ID_LENGTH);
 };
 
 // Generate a random alphanumeric string
 export const generateRandomString = (length: number = 6): string => {
   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   let result = '';
   for (let i = 0; i < length; i++) {
     result += chars.charAt(Math.floor(Math.random() * chars.length));
   }
   return result;
 };
 
 // Sanitize user ID for ZEGO (alphanumeric, max 32 chars)
 export const sanitizeZegoId = (id: string): string => {
   const cleaned = (id || 'guest').replace(/[^a-zA-Z0-9]/g, '');
   return cleaned.slice(0, ZEGO_CONFIG.MAX_CALL_ID_LENGTH) || 'guest';
 };