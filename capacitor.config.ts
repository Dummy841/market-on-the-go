import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zippy.app',
  appName: 'Zippy',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    // CRITICAL: This allows the webview to hand off the URL to the Android System
    allowNavigation: [
      'upi://*',
      'tez://*',
      'phonepe://*',
      'paytmmp://*',
      'paytm://*',
      '*.razorpay.com',
      '*.cashfree.com'
    ]
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#FF6B00',
      sound: 'ringtone',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#1e293b',
    captureInput: true, 
  },
};

export default config;
