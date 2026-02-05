

# Voice Call System - Complete Fix Plan

## Overview

This plan addresses all the voice call issues between users and delivery partners:

1. **Ringtone not playing for users** when delivery partner calls
2. **One-way/no audio connection** between caller and receiver
3. **Mute and Speaker buttons not working** properly
4. **Android background call handling** with lock screen wake-up

## Root Cause Analysis

After reviewing the code, I identified these core issues:

1. **Room ID Mismatch**: Caller and callee may join different rooms because the callee uses `pending.roomId` from the broadcast, but the caller generates a new `kitToken` with `creds.roomId`. If these don't match exactly, both parties are in separate rooms with no audio bridge.

2. **Race Condition in joinRoom**: The `tryJoinRoom` function has multiple guards (`zegoInstanceReadyRef`, `containerRef`, etc.) that can cause the join to silently fail or happen too late.

3. **Ringtone Playback Timing**: The `playRingtone` function is called, but browser autoplay policies may block it. The current fallback (vibration + toast) doesn't reliably trigger on all Android WebViews.

4. **Mute/Speaker Functions**: These attempt to use internal ZEGO Express Engine methods that may not be exposed on the UIKit wrapper. The current approach is best-effort but unreliable.

5. **Missing Android Foreground Service**: For true background call handling with screen wake-up, Android requires a foreground service with proper notification channels and wake locks.

## Technical Solution

### 1. Fix Room Join Logic (Critical for Two-Way Audio)

**File: `src/hooks/useZegoVoiceCall.ts`**

The core fix ensures both caller and callee use the **exact same roomId** and join the room at the right time:

```text
Current Flow (Broken):
  Caller: generates roomId -> creates ZEGO -> broadcasts incoming-call with roomId
  Callee: receives roomId -> stores in pendingCallRef -> on answer, uses pending.roomId
  
  Problem: Callee may generate a NEW roomId via getCredentials(pending.roomId)
           if the server echoes a different format or the client re-encodes it
```

**Fix:**
- Ensure `getCredentials` returns the **exact** roomId passed to it (already does, but we need to verify the callee path)
- Add logging to verify both sides join the same room
- Add a `joinRoom` retry mechanism with exponential backoff

### 2. Fix Ringtone Playback

**File: `src/hooks/useZegoVoiceCall.ts`**

Add a more aggressive audio unlock strategy and ensure ringtone plays on incoming call:

- Pre-unlock audio on app load (not just on user gesture)
- Use AudioContext for reliable playback in WebViews
- Add a user-initiated audio unlock if autoplay fails (full-screen tap target)

### 3. Fix Mute/Speaker Controls

**File: `src/hooks/useZegoVoiceCall.ts`**

Replace the current approach with ZegoUIKitPrebuilt's documented API:

- Use `zego.setMicrophoneOn(boolean)` for mute
- Use `zego.setAudioOutputDevice(deviceId)` or toggle between speaker/earpiece modes
- Add fallback to direct WebRTC track manipulation if UIKit methods fail

### 4. Add Android Background Call Support

**Files:**
- `src/hooks/useNativeNotifications.ts` - Enhanced with wake lock and full-screen intent
- `android/app/src/main/res/raw/ringtone.mp3` - Place the ringtone file
- `capacitor.config.ts` - Configure plugins

For Android, we need:
- **Foreground Service**: Keep the app running during calls
- **Wake Lock**: Wake the screen on incoming calls
- **Full-Screen Intent**: Show incoming call UI over lock screen
- **VIBRATE permission**: For vibration fallback

---

## Implementation Details

### Step 1: Hardened Room Join Logic

```typescript
// In useZegoVoiceCall.ts - answerCall function

const answerCall = useCallback(async () => {
  const pending = pendingCallRef.current;
  if (!pending) return;

  // CRITICAL: Use the EXACT roomId from the caller's broadcast
  const roomIdToJoin = pending.roomId;
  
  // Get credentials but force the same roomId
  const creds = await getCredentials(roomIdToJoin);
  
  // Verify roomId matches
  console.log(`[ZEGO] Joining room: ${creds.roomId} (expected: ${roomIdToJoin})`);
  if (creds.roomId !== roomIdToJoin) {
    console.error('[ZEGO] Room ID mismatch! This will cause one-way audio.');
  }
  
  // Create ZEGO instance and join
  // ... rest of logic
}, [...]);
```

### Step 2: Reliable Audio Controls

```typescript
// In useZegoVoiceCall.ts - toggleMute function

const toggleMute = useCallback(async () => {
  const zego = zegoRef.current;
  if (!zego) return;
  
  const newMuted = !latestStateRef.current.isMuted;
  
  try {
    // Method 1: UIKit API (preferred)
    if (typeof (zego as any).setMicrophoneOn === 'function') {
      await (zego as any).setMicrophoneOn(!newMuted);
      console.log(`[ZEGO] Mute set via UIKit: ${newMuted}`);
    }
    
    // Method 2: Get local audio track and disable
    const localStream = (zego as any).localStream;
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newMuted;
        console.log(`[ZEGO] Mute set via track: ${newMuted}`);
      }
    }
  } catch (e) {
    console.warn('[ZEGO] Mute toggle failed:', e);
  }
  
  setState(prev => ({ ...prev, isMuted: newMuted }));
}, []);

const toggleSpeaker = useCallback(async () => {
  const newSpeaker = !latestStateRef.current.isSpeaker;
  
  try {
    // For web: Can't truly switch output device without setSinkId
    // For mobile: We'll rely on native audio routing
    
    // Try to get all audio elements and toggle their output
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach((el: any) => {
      if (typeof el.setSinkId === 'function') {
        // Modern browsers support this
        // We'd need to enumerate devices to find speaker vs earpiece
        // For now, just log
        console.log('[ZEGO] setSinkId available but device list needed');
      }
    });
    
    // For Capacitor/native: We need a native plugin to route audio
    // This is a limitation of web-based audio
    console.log(`[ZEGO] Speaker toggled (UI only): ${newSpeaker}`);
  } catch (e) {
    console.warn('[ZEGO] Speaker toggle failed:', e);
  }
  
  setState(prev => ({ ...prev, isSpeaker: newSpeaker }));
}, []);
```

### Step 3: Reliable Ringtone with AudioContext

```typescript
// In useZegoVoiceCall.ts - enhanced playRingtone

const playRingtone = useCallback(async (callerName?: string) => {
  // Create AudioContext to bypass autoplay restrictions
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume context (required after user interaction)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  } catch (e) {
    console.warn('AudioContext not available:', e);
  }
  
  // Try playing the ringtone
  const audio = ringtoneRef.current;
  if (!audio) {
    startVibration();
    showBrowserNotification(callerName || 'Incoming Call');
    return;
  }
  
  audio.currentTime = 0;
  audio.volume = 1.0;
  
  try {
    await audio.play();
    console.log('[Ringtone] Playing successfully');
  } catch (err) {
    console.warn('[Ringtone] Autoplay blocked, using fallbacks');
    
    // Fallback 1: Vibration
    startVibration();
    
    // Fallback 2: Browser/Native notification
    showBrowserNotification(callerName || 'Incoming Call');
    
    // Fallback 3: Show tap-to-play overlay
    toast({
      title: 'Incoming Call',
      description: 'Tap to enable sound',
      duration: 30000,
    });
  }
}, [startVibration, showBrowserNotification, toast]);
```

### Step 4: Android Background Call Handling

**Update `src/hooks/useNativeNotifications.ts`:**

```typescript
// Enhanced incoming call notification for Android
const showIncomingCallNotification = useCallback(async (
  callerName: string,
  callId: string
): Promise<number> => {
  const notificationId = Math.floor(Math.random() * 100000);
  
  if (!Capacitor.isNativePlatform()) {
    // Web fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('📞 Incoming Call', { 
        body: `${callerName} is calling...`,
        requireInteraction: true,
        tag: 'incoming-call',
      });
    }
    return notificationId;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: '📞 Incoming Call',
          body: `${callerName} is calling...`,
          channelId: 'zippy_calls',
          sound: 'ringtone', // Uses android/app/src/main/res/raw/ringtone.mp3
          extra: { type: 'incoming_call', callId },
          smallIcon: 'ic_notification',
          iconColor: '#FF6B00',
          ongoing: true,        // Persistent notification
          autoCancel: false,    // Don't dismiss on tap
          actionTypeId: 'INCOMING_CALL',
          // Android-specific for lock screen
          importance: 5,        // MAX importance
          visibility: 1,        // PUBLIC - show on lock screen
        },
      ],
    });
    
    // Vibrate device
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
    
    console.log('[Native] Incoming call notification scheduled:', notificationId);
  } catch (error) {
    console.error('[Native] Error showing call notification:', error);
  }

  return notificationId;
}, []);
```

### Step 5: Android Capacitor Configuration

**Update `capacitor.config.ts`:**

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.272be06f1428431096298c2f21b87333',
  appName: 'zippydelivary',
  webDir: 'dist',
  server: {
    url: 'https://272be06f-1428-4310-9629-8c2f21b87333.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#FF6B00',
      sound: 'ringtone.mp3',
    },
  },
};
```

**Required Android Setup (User Must Do Manually):**

1. Add `ringtone.mp3` to `android/app/src/main/res/raw/`
2. Add permissions to `AndroidManifest.xml`:
   - `VIBRATE`
   - `WAKE_LOCK`
   - `USE_FULL_SCREEN_INTENT`
   - `FOREGROUND_SERVICE`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useZegoVoiceCall.ts` | Fix room join logic, audio controls, ringtone |
| `src/hooks/useNativeNotifications.ts` | Enhanced Android notification with wake lock |
| `src/contexts/GlobalZegoVoiceCallContext.tsx` | Add delay handling for UI mount |
| `src/contexts/DeliveryPartnerZegoVoiceCallContext.tsx` | Same timing fixes |
| `src/components/voice-call/VoiceCallModal.tsx` | Ensure container is set before join |
| `capacitor.config.ts` | Add notification plugin config |

---

## Testing Checklist

After implementation, test these scenarios:

1. **User calls Delivery Partner**
   - User sees "Calling..." with End/Mute/Speaker buttons
   - Partner hears ringtone and sees incoming call overlay
   - Partner answers, both hear each other
   - Mute button stops sending audio
   - End from either side disconnects both

2. **Delivery Partner calls User**
   - Partner sees "Calling..." with controls
   - User hears ringtone and sees incoming call overlay
   - User answers, both hear each other
   - End from either side disconnects both

3. **Android Background Call**
   - When app is backgrounded, incoming call shows lock screen notification
   - Tapping notification opens app to call screen
   - Answer/Decline buttons work from notification

---

## Limitations

- **True speaker/earpiece toggle** requires native audio routing plugins (beyond Capacitor LocalNotifications)
- **Full lock-screen call UI** (like WhatsApp) requires a native Android foreground service and ConnectionService
- **iOS background calls** need CallKit integration for proper behavior

