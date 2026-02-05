 package com.zippy.app;
 
 import android.app.KeyguardManager;
 import android.content.Context;
 import android.os.Build;
 import android.os.Bundle;
 import android.os.PowerManager;
 import android.view.WindowManager;
 
 import com.getcapacitor.BridgeActivity;
 
 public class MainActivity extends BridgeActivity {
     private PowerManager.WakeLock wakeLock;
 
     @Override
     protected void onCreate(Bundle savedInstanceState) {
         super.onCreate(savedInstanceState);
 
         // Enable showing over lock screen for incoming calls
         enableLockScreenDisplay();
     }
 
     /**
      * Configure the activity to show over the lock screen.
      * This is essential for incoming call notifications.
      */
     private void enableLockScreenDisplay() {
         if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
             // Android 8.1+ (API 27+)
             setShowWhenLocked(true);
             setTurnScreenOn(true);
 
             KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
             if (keyguardManager != null) {
                 keyguardManager.requestDismissKeyguard(this, null);
             }
         } else {
             // Legacy approach for older Android versions
             getWindow().addFlags(
                 WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                 WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                 WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                 WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
             );
         }
     }
 
     /**
      * Acquire wake lock to wake up the device for incoming calls.
      * Call this from JavaScript via a Capacitor plugin when receiving a call.
      */
     public void acquireWakeLock() {
         if (wakeLock != null && wakeLock.isHeld()) {
             return;
         }
 
         PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
         if (powerManager != null) {
             wakeLock = powerManager.newWakeLock(
                 PowerManager.FULL_WAKE_LOCK |
                 PowerManager.ACQUIRE_CAUSES_WAKEUP |
                 PowerManager.ON_AFTER_RELEASE,
                 "Zippy::IncomingCallWakeLock"
             );
             wakeLock.acquire(60 * 1000L); // 60 seconds max
         }
     }
 
     /**
      * Release the wake lock when call ends or is dismissed.
      */
     public void releaseWakeLock() {
         if (wakeLock != null && wakeLock.isHeld()) {
             wakeLock.release();
             wakeLock = null;
         }
     }
 
     @Override
     protected void onDestroy() {
         releaseWakeLock();
         super.onDestroy();
     }
 }