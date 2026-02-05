 package com.zippy.app;
 
 import android.app.KeyguardManager;
 import android.content.Context;
 import android.os.Build;
 import android.os.PowerManager;
 import android.view.WindowManager;
 
 import com.getcapacitor.JSObject;
 import com.getcapacitor.Plugin;
 import com.getcapacitor.PluginCall;
 import com.getcapacitor.PluginMethod;
 import com.getcapacitor.annotation.CapacitorPlugin;
 
 @CapacitorPlugin(name = "LockScreen")
 public class LockScreenPlugin extends Plugin {
     private PowerManager.WakeLock wakeLock;
 
     @PluginMethod
     public void wakeScreen(PluginCall call) {
         getActivity().runOnUiThread(() -> {
             try {
                 // Acquire wake lock to turn on screen
                 PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                 if (powerManager != null) {
                     if (wakeLock != null && wakeLock.isHeld()) {
                         wakeLock.release();
                     }
                     
                     wakeLock = powerManager.newWakeLock(
                         PowerManager.FULL_WAKE_LOCK |
                         PowerManager.ACQUIRE_CAUSES_WAKEUP |
                         PowerManager.ON_AFTER_RELEASE,
                         "Zippy::IncomingCallWakeLock"
                     );
                     wakeLock.acquire(60 * 1000L); // 60 seconds max
                 }
 
                 // Set flags to show over lock screen
                 if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                     getActivity().setShowWhenLocked(true);
                     getActivity().setTurnScreenOn(true);
 
                     KeyguardManager keyguardManager = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
                     if (keyguardManager != null) {
                         keyguardManager.requestDismissKeyguard(getActivity(), null);
                     }
                 } else {
                     getActivity().getWindow().addFlags(
                         WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                         WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                         WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                         WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                     );
                 }
 
                 call.resolve();
             } catch (Exception e) {
                 call.reject("Failed to wake screen: " + e.getMessage());
             }
         });
     }
 
     @PluginMethod
     public void releaseWakeLock(PluginCall call) {
         getActivity().runOnUiThread(() -> {
             try {
                 if (wakeLock != null && wakeLock.isHeld()) {
                     wakeLock.release();
                     wakeLock = null;
                 }
 
                 // Clear lock screen flags
                 if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                     getActivity().setShowWhenLocked(false);
                     getActivity().setTurnScreenOn(false);
                 } else {
                     getActivity().getWindow().clearFlags(
                         WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                         WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                         WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                         WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                     );
                 }
 
                 call.resolve();
             } catch (Exception e) {
                 call.reject("Failed to release wake lock: " + e.getMessage());
             }
         });
     }
 }