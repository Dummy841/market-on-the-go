 import type { CapacitorConfig } from '@capacitor/cli';
 
 const config: CapacitorConfig = {
   appId: 'com.zippy.app',
   appName: 'Zippy',
   webDir: 'dist',
   server: {
     //url: 'https://272be06f-1428-4310-9629-8c2f21b87333.lovableproject.com?forceHideBadge=true',
     cleartext: true,
   },
   plugins: {
     LocalNotifications: {
       smallIcon: 'ic_notification',
       iconColor: '#FF6B00',
       sound: 'ringtone',
     },
     // Push notifications for background call signaling
     PushNotifications: {
       presentationOptions: ['badge', 'sound', 'alert'],
     },
   },
   android: {
     allowMixedContent: true,
     // Enable background fetch for notifications
     backgroundColor: '#1e293b',
   },
 };
 
 export default config;
