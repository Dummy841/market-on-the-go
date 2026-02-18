package com.zippy.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable showing over lock screen for incoming calls
        enableLockScreenDisplay();

        // Override WebViewClient to handle UPI intent URLs for Razorpay
        setupWebViewForUPI();
    }

    /**
     * Override WebViewClient to intercept UPI and intent URLs
     * so Razorpay can launch UPI apps (PhonePe, GPay, Paytm, etc.)
     */
    private void setupWebViewForUPI() {
        this.bridge.getWebView().setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                String urlString = url.toString();

                // Handle UPI deep links (upi://pay?...)
                if ("upi".equals(scheme)) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, url);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return false;
                    }
                }

                // Handle intent:// URLs (used by Razorpay for app-specific intents)
                if ("intent".equals(scheme)) {
                    try {
                        Intent intent = Intent.parseUri(urlString, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            // Check if any app can handle this intent
                            if (intent.resolveActivity(getPackageManager()) != null) {
                                startActivity(intent);
                                return true;
                            }
                            // Try fallback URL if available
                            String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                            if (fallbackUrl != null) {
                                view.loadUrl(fallbackUrl);
                                return true;
                            }
                            // Try opening in Play Store
                            String packageName = intent.getPackage();
                            if (packageName != null) {
                                Intent marketIntent = new Intent(Intent.ACTION_VIEW,
                                    Uri.parse("market://details?id=" + packageName));
                                startActivity(marketIntent);
                                return true;
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    return true;
                }

                // Handle tez:// (Google Pay), phonepe://, paytm:// etc.
                if (scheme != null && !scheme.equals("http") && !scheme.equals("https")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, url);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                            return true;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                // Let the WebView handle normal http/https URLs
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    /**
     * Configure the activity to show over the lock screen.
     * This is essential for incoming call notifications.
     */
    private void enableLockScreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);

            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
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
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }
}
