 import type { CapacitorConfig } from '@capacitor/cli';
 
 const config: CapacitorConfig = {
   appId: 'app.lovable.272be06f1428431096298c2f21b87333',
   appName: 'zippydelivary',
   webDir: 'dist',
   server: {
     url: 'https://272be06f-1428-4310-9629-8c2f21b87333.lovableproject.com?forceHideBadge=true',
     cleartext: true,
   },
   plugins: {
     LocalNotifications: {
       smallIcon: 'ic_notification',
       iconColor: '#FF6B00',
       sound: 'ringtone.mp3',
     },
   },
   android: {
     allowMixedContent: true,
   },
 };
 
 export default config;