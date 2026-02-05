
# Professional 1-on-1 Voice Calling Feature - Implementation Plan

## Overview

This plan redesigns the existing voice calling system to provide a professional WhatsApp/Instagram-style experience using the ZEGOCLOUD UIKit. The current implementation already uses `@zegocloud/zego-uikit-prebuilt`, but the UI/UX needs a complete overhaul for a polished, production-ready appearance.

## Current State Analysis

The project already has:
- ZEGOCLOUD integration via `@zegocloud/zego-uikit-prebuilt` (v2.17.2)
- Edge function `get-zego-token` returning credentials
- Secrets configured: `ZEGO_APP_ID`, `ZEGO_SERVER_SECRET`
- Voice call hook: `src/hooks/useZegoVoiceCall.ts` (944 lines)
- Basic call modal: `src/components/ZegoVoiceCallModal.tsx`
- Global context: `src/contexts/GlobalZegoVoiceCallContext.tsx`
- Database table: `voice_calls` with proper schema

## Architecture Decision

**Approach: Dedicated Voice Call Page (Not Modal)**

Instead of an overlay modal, we'll create a dedicated `/voice-call/:callId` page. This approach:
- Provides cleaner state management via URL
- Handles browser back button naturally
- Works better on mobile (full-screen experience)
- Allows graceful navigation after call ends

---

## Implementation Steps

### Phase 1: Configuration & Security

**1.1 Create ZEGO Config File**

Create `src/config/zego.ts` to centralize ZEGOCLOUD configuration:

```text
src/config/zego.ts
```

This file will export:
- Call scenario modes (OneOnOne Voice)
- Default call timeout (30 seconds)
- Audio-only configuration flags
- Room ID generation utility

### Phase 2: Redesigned Voice Call UI

**2.1 New Professional Voice Call Page**

Create `src/pages/VoiceCall.tsx` - A dedicated full-screen page with:

**Visual Design (WhatsApp/Instagram Style):**
- Glassmorphism blurred background with gradient overlay
- Large centered avatar with subtle pulsing animation during ringing
- Caller name prominently displayed
- Call duration timer at the top (during ongoing calls)
- Status text (Calling... / Ringing... / Connected)

**Control Bar (Bottom Floating):**
```text
+--------------------------------------------------+
|                                                  |
|              [Avatar with pulse]                 |
|                                                  |
|              "Delivery Partner"                  |
|                  00:45                           |
|                                                  |
|     +------+    +------+    +------+             |
|     | Mute |    | End  |    |Speaker|            |
|     +------+    +------+    +------+             |
+--------------------------------------------------+
```

**States to Handle:**
- `calling` - Outgoing call, show ringback animation
- `ringing` - Incoming call, show Answer/Decline buttons
- `ongoing` - Connected, show timer and controls
- `ended`/`declined`/`missed` - Auto-navigate back after 2s

**2.2 Call Control Components**

Create `src/components/voice-call/CallAvatar.tsx`:
- Animated rings during calling/ringing
- Profile image or initial fallback
- Pulse effect with CSS animations

Create `src/components/voice-call/CallControls.tsx`:
- Floating bottom bar with blur backdrop
- Mute toggle (mic icon with visual state)
- End call button (prominent red)
- Speaker toggle (speaker icon with state)
- Answer/Decline buttons for incoming calls

Create `src/components/voice-call/CallTimer.tsx`:
- Displays elapsed time in MM:SS format
- Only visible during ongoing calls

### Phase 3: Refactored Voice Call Hook

**3.1 Enhanced `useZegoVoiceCall.ts`**

Refactor the existing hook to:

1. **Improve Call ID Generation:**
   - Generate unique callID: `call_${Date.now()}_${randomString(6)}`
   - Ensure alphanumeric, max 32 chars (ZEGO requirement)

2. **Proper Navigation Integration:**
   - On call initiation: `navigate('/voice-call/' + callId)`
   - On call end: `navigate(-1)` or to previous page

3. **Better Audio Control:**
   - Actual mute/unmute via ZEGO SDK methods
   - Speaker toggle for native platforms

4. **Ringback Tone for Caller:**
   - Play subtle "calling" sound while waiting for answer

### Phase 4: Call Initiation Flow

**4.1 Update Chat Components**

Modify `UserDeliveryChat.tsx` and `DeliveryCustomerChat.tsx`:

When call button clicked:
1. Generate unique callId
2. Store call intent in state/context
3. Navigate to `/voice-call/:callId`
4. The VoiceCall page handles ZEGO connection

**4.2 Incoming Call Handling**

The global context already listens for incoming calls. Modify to:
1. On incoming call → Store pending call data
2. Show incoming call UI (can be overlay initially)
3. If answered → Navigate to `/voice-call/:callId`
4. If declined → Clear state, stay on current page

### Phase 5: Route Configuration

**5.1 Add Voice Call Route**

Update `src/App.tsx`:

```typescript
<Route path="/voice-call/:callId" element={<VoiceCall />} />
```

### Phase 6: Responsive Design

**6.1 Mobile Optimization**
- Full viewport height (`100dvh` for mobile browsers)
- Safe area insets for notched devices
- Touch-friendly button sizes (min 48x48px)
- Prevent scroll bounce

**6.2 Desktop Optimization**
- Centered card layout with max-width
- Keyboard shortcuts (M for mute, S for speaker)
- Hover states on controls

---

## File Changes Summary

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `src/config/zego.ts` | ZEGO configuration constants |
| Create | `src/pages/VoiceCall.tsx` | Main voice call page |
| Create | `src/components/voice-call/CallAvatar.tsx` | Animated avatar component |
| Create | `src/components/voice-call/CallControls.tsx` | Bottom control bar |
| Create | `src/components/voice-call/CallTimer.tsx` | Duration display |
| Create | `src/components/voice-call/IncomingCallOverlay.tsx` | Overlay for incoming calls |
| Modify | `src/hooks/useZegoVoiceCall.ts` | Add navigation, improve audio controls |
| Modify | `src/contexts/GlobalZegoVoiceCallContext.tsx` | Handle navigation + incoming overlay |
| Modify | `src/contexts/DeliveryPartnerZegoVoiceCallContext.tsx` | Same updates for delivery partner |
| Modify | `src/components/UserDeliveryChat.tsx` | Update call initiation flow |
| Modify | `src/components/DeliveryCustomerChat.tsx` | Update call initiation flow |
| Modify | `src/App.tsx` | Add voice call route |
| Delete | `src/components/ZegoVoiceCallModal.tsx` | Replace with page-based approach |

---

## Technical Details

### CSS Animation for Avatar Pulse

```css
.call-pulse-ring {
  animation: pulse-ring 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 0.3; }
  100% { transform: scale(0.9); opacity: 0.7; }
}
```

### Glassmorphism Background

```css
.call-backdrop {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
  backdrop-filter: blur(20px);
}
```

### ZEGO Audio-Only Configuration

```typescript
zegoInstance.joinRoom({
  container: hiddenDiv, // 1x1px hidden element
  scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
  turnOnCameraWhenJoining: false,
  turnOnMicrophoneWhenJoining: true,
  showMyCameraToggleButton: false,
  showScreenSharingButton: false,
});
```

---

## Edge Cases Handled

1. **Browser Back Button**: Uses `navigate(-1)` properly
2. **Call Timeout**: 30-second missed call handling
3. **Permission Denied**: Clear error messaging
4. **Network Loss**: ZEGO SDK handles reconnection
5. **Both Parties Hang Up Simultaneously**: Uses `endingRef` to prevent loops
6. **Audio Autoplay Blocked**: Shows toast + uses vibration/notification fallback

---

## Estimated Complexity

- **New Files**: 6 components/pages
- **Modified Files**: 6 existing files
- **Lines of Code**: ~800-1000 new/modified lines
- **Testing Focus**: Both user and delivery partner call flows, mobile and desktop

This implementation will deliver a polished, WhatsApp-quality voice calling experience while maintaining all existing functionality including native notifications, ringtones, and fallbacks.
