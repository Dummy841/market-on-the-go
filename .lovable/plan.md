
# Fix: Complete Exotel Migration - Remove All ZegoCloud Voice Call Code

## Problem
Two issues visible in the screenshots:
- **User side**: "Edge Function returned a non-2xx status code" -- caused by `GlobalZegoVoiceCallProvider` in `App.tsx` trying to initialize ZegoCloud (calling `get-zego-token`) and failing.
- **Delivery partner side**: Still showing the old ZegoCloud in-app voice call UI (Mute/End/Earpiece buttons) because `DeliveryPartnerOrders.tsx` still calls `voiceCall.startCall()` via `DeliveryPartnerZegoVoiceCallContext`.

## Root Cause
Only `DeliveryCustomerChat.tsx` and `UserDeliveryChat.tsx` were updated to use Exotel. But the call buttons in `DeliveryPartnerOrders.tsx` and `OrderTrackingModal.tsx` + the providers in `App.tsx` and `DeliveryPartnerDashboard.tsx` still use ZegoCloud.

## Solution: Remove all ZegoCloud voice call code, use Exotel everywhere

### Step 1: Update `DeliveryPartnerOrders.tsx`
- Remove `useDeliveryPartnerZegoVoiceCall` import
- Add `useExotelCall` hook
- Replace `handleVoiceCall` to fetch both mobile numbers and call `initiateCall()` via Exotel
- No in-app call UI -- Exotel dials both phones natively

### Step 2: Remove `DeliveryPartnerZegoVoiceCallProvider` from `DeliveryPartnerDashboard.tsx`
- Remove the `DeliveryPartnerZegoVoiceCallProvider` wrapper entirely
- Just render children directly

### Step 3: Remove `GlobalZegoVoiceCallProvider` from `App.tsx`
- Remove the provider wrapper that initializes ZegoCloud on every page load
- This fixes the "Edge Function returned non-2xx" error

### Step 4: Remove the `/voice-call/:callId` route and `VoiceCall.tsx` page
- This page was the ZegoCloud in-app call UI -- no longer needed
- Exotel calls happen on the native phone dialer

### Step 5: Clean up unused files (optional but recommended)
Remove these files that are no longer used:
- `src/contexts/GlobalZegoVoiceCallContext.tsx`
- `src/contexts/DeliveryPartnerZegoVoiceCallContext.tsx`
- `src/contexts/DeliveryPartnerVoiceCallContext.tsx`
- `src/contexts/GlobalVoiceCallContext.tsx`
- `src/hooks/useZegoVoiceCall.ts`
- `src/hooks/useZegoSignaling.ts`
- `src/hooks/useIncomingCall.ts`
- `src/hooks/useVoiceCall.ts`
- `src/services/zegoSignalingService.ts`
- `src/config/zego.ts`
- `src/pages/VoiceCall.tsx`
- `src/components/voice-call/VoiceCallModal.tsx`
- `src/components/voice-call/IncomingCallOverlay.tsx`
- `src/components/voice-call/CallAvatar.tsx`
- `src/components/voice-call/CallControls.tsx`
- `src/components/voice-call/CallTimer.tsx`
- `src/components/VoiceCallModal.tsx`

### How Calls Will Work After This
1. User or delivery partner taps "Call" button
2. App calls `exotel-click-to-call` edge function with both mobile numbers
3. Exotel dials the caller's phone first (shows Exotel virtual number / EXOTEL_CALLER_ID)
4. Caller picks up on native phone dialer
5. Exotel then dials the other party and connects them
6. Neither party sees the other's real number

### About Caller ID Display
Exotel shows the `EXOTEL_CALLER_ID` (virtual number) on both phones. Custom names like "Zippy Delivery Partner" or "Zippy Customer" cannot be set by Exotel -- this depends on the recipient's phone contacts. However, the app will show a toast notification with the appropriate label ("Connecting to Zippy Delivery Partner..." or "Connecting to Zippy Customer...") so the user knows who they are being connected to.

### Files Modified

| File | Change |
|------|--------|
| `src/components/DeliveryPartnerOrders.tsx` | Replace ZegoCloud with Exotel call |
| `src/pages/DeliveryPartnerDashboard.tsx` | Remove ZegoCloud provider wrapper |
| `src/App.tsx` | Remove GlobalZegoVoiceCallProvider |
| `src/hooks/useExotelCall.ts` | Add caller/callee name in toast messages |
| Multiple files | Delete unused ZegoCloud files |
