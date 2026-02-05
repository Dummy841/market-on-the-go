 # Android Incoming Call Setup Guide
 
 This guide covers how to set up lock screen incoming call notifications for the Zippy Android app.
 
 ## Prerequisites
 
 1. Ensure you have the required files in place:
    - `android/app/src/main/res/raw/ringtone.mp3` - Your call ringtone
 
 ## Step 1: Register the LockScreen Plugin
 
 Update your `MainActivity.java` to register the custom plugin:
 
 ```java
 package com.zippy.app;
 
 import android.os.Bundle;
 import com.getcapacitor.BridgeActivity;
 
 public class MainActivity extends BridgeActivity {
     @Override
     protected void onCreate(Bundle savedInstanceState) {
         // Register custom plugins BEFORE super.onCreate()
         registerPlugin(LockScreenPlugin.class);
         
         super.onCreate(savedInstanceState);
     }
 }
 ```
 
 ## Step 2: Verify AndroidManifest.xml Permissions
 
 Ensure these permissions are in your `AndroidManifest.xml`:
 
 ```xml
 <!-- Notification and call permissions -->
 <uses-permission android:name="android.permission.VIBRATE" />
 <uses-permission android:name="android.permission.WAKE_LOCK" />
 <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
 <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
 <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
 ```
 
 And add these attributes to your MainActivity activity tag:
 
 ```xml
 <activity
     android:name=".MainActivity"
     android:showWhenLocked="true"
     android:turnScreenOn="true"
     ...>
 ```
 
 ## Step 3: Build and Sync
 
 After making changes:
 
 ```bash
 # Pull the latest code
 git pull
 
 # Install dependencies
 npm install
 
 # Build the web app
 npm run build
 
 # Sync with Capacitor
 npx cap sync android
 
 # Run on device/emulator
 npx cap run android
 ```
 
 ## How It Works
 
 1. **ZIM Signaling**: When User A calls User B, the call invitation is sent via ZegoCloud ZIM signaling
 2. **Background Push**: If User B's app is in background, ZIM sends a push notification via FCM
 3. **Lock Screen Wake**: The `LockScreenPlugin` wakes the device and shows the app over the lock screen
 4. **Full-Screen Intent**: The notification uses `IMPORTANCE_HIGH` with full-screen intent behavior
 5. **Ringtone**: The `ringtone.mp3` from `res/raw/` plays via the notification channel
 
 ## ZegoCloud Console Setup (Required for Background Push)
 
 For offline push notifications to work, you need to configure FCM in ZegoCloud:
 
 1. Go to [ZEGOCLOUD Admin Console](https://console.zegocloud.com/)
 2. Navigate to your project → Push Notification
 3. Upload your Firebase Cloud Messaging (FCM) server key
 4. Create a Resource ID named `zippy_calls`
 5. This Resource ID is used in the call invitation push config
 
 ## Testing
 
 1. Install the app on two devices
 2. Lock one device's screen
 3. Make a call from the other device
 4. The locked device should:
    - Wake up the screen
    - Show the incoming call notification
    - Play the ringtone
    - Display Answer/Decline buttons
 
 ## Troubleshooting
 
 **Screen doesn't wake up:**
 - Check that `WAKE_LOCK` permission is granted
 - Verify `LockScreenPlugin.java` is in the correct package
 - Ensure the plugin is registered in `MainActivity`
 
 **Ringtone doesn't play:**
 - Verify `ringtone.mp3` exists in `android/app/src/main/res/raw/`
 - Check that the notification channel uses the correct sound name (without extension)
 
 **Background notifications don't arrive:**
 - Configure FCM in ZegoCloud console
 - Ensure the app has notification permissions
 - Check that ZIM is properly initialized and logged in