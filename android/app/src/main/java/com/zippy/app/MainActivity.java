package com.zippy.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;
    private static final String TAG = "ZippyPayment";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableLockScreenDisplay();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupWebViewForUPI();
    }

    private void setupWebViewForUPI() {
        if (this.bridge == null || this.bridge.getWebView() == null) {
            Log.e(TAG, "Bridge or WebView not initialized");
            return;
        }

        this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                String urlString = url.toString();

                Log.d(TAG, "Attempting to load URL: " + urlString);

                // 1. Handle UPI deep links
                if ("upi".equals(scheme)) {
                    Log.d(TAG, "UPI Link Detected! Redirecting...");
                    return launchExternalApp(urlString);
                }

                // 2. Handle intent:// URLs (Commonly used by Razorpay/Paytm)
                if ("intent".equals(scheme)) {
                    try {
                        Intent intent = Intent.parseUri(urlString, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            if (intent.resolveActivity(getPackageManager()) != null) {
                                startActivity(intent);
                                return true;
                            }
                            String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                            if (fallbackUrl != null) {
                                view.loadUrl(fallbackUrl);
                                return true;
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing intent: " + e.getMessage());
                    }
                    return true;
                }

                // 3. Handle specific app schemes
                if (scheme != null && (scheme.equals("tez") || scheme.equals("phonepe") || 
                    scheme.equals("paytmmp") || scheme.equals("paytm"))) {
                    return launchExternalApp(urlString);
                }

                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    private boolean launchExternalApp(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Exception in launchExternalApp: " + e.getMessage());
        }
        return false;
    }

    private void enableLockScreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    public void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.FULL_WAKE_LOCK |
                                     PowerManager.ACQUIRE_CAUSES_WAKEUP |
                                     PowerManager.ON_AFTER_RELEASE, "Zippy::WakeLock");
            wakeLock.acquire(60 * 1000L);
        }
    }

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
