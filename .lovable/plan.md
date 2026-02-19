

# Plan: Mobile Number Validation + Exotel Click-to-Call Integration

## Part 1: Fix Invalid Mobile Number OTP Waste

**Problem**: Currently, any 10-digit number (even invalid ones like 3564563165) triggers OTP sending via Renflair, wasting SMS credits.

**Solution**: Add Indian mobile number validation on both client-side and server-side.

Indian mobile numbers must:
- Be exactly 10 digits
- Start with 6, 7, 8, or 9 (valid Indian mobile prefixes)

### Changes:

1. **LoginForm.tsx** - Add regex validation `/^[6-9]\d{9}$/` before calling the edge function. Show "Invalid mobile number" error immediately without making any API call.

2. **RegisterForm.tsx** - Same validation as LoginForm.

3. **send-2factor-otp edge function** - Add server-side validation as a safety net: reject any mobile not matching `/^[6-9]\d{9}$/` with an "Invalid mobile number" error before calling Renflair API.

---

## Part 2: Exotel Click-to-Call Integration

**How it works**: When user or delivery partner taps the "Call" button, the app calls an edge function which triggers Exotel's Click-to-Call API. Exotel first dials the caller, then connects them to the other party. Neither party sees the other's real phone number -- they see the Exotel virtual number instead.

### Changes:

1. **Add Exotel secrets** - Store `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, and `EXOTEL_CALLER_ID` (virtual number) as Supabase secrets.

2. **Create `exotel-click-to-call` edge function** - New edge function that:
   - Accepts `{ from: string, to: string, orderId?: string }` (10-digit mobile numbers)
   - Validates both numbers
   - Calls Exotel's Connect API: `POST https://{SID}:{TOKEN}@api.exotel.com/v1/Accounts/{SID}/Calls/connect`
   - Returns the call SID for tracking
   - Stores call record in a new `exotel_calls` table

3. **Create `exotel_calls` database table** - To track call history:
   - `id` (uuid, primary key)
   - `order_id` (text, nullable)
   - `caller_mobile` (text)
   - `callee_mobile` (text)
   - `caller_type` (text - 'user' or 'delivery_partner')
   - `exotel_call_sid` (text)
   - `status` (text - 'initiated', 'ringing', 'connected', 'completed', 'failed')
   - `created_at` (timestamptz)

4. **Update voice call UI** - Replace the current ZegoCloud call initiation with Exotel click-to-call:
   - When user taps "Call", invoke the `exotel-click-to-call` edge function
   - Show a simple "Connecting your call..." status UI
   - The actual call happens on the phone's native dialer (Exotel dials both parties)
   - Remove ZegoCloud voice call dependencies or keep them as optional

5. **Update delivery partner call flow** - Same approach for delivery partner calling user.

---

## Technical Details

### Exotel API Call

```text
POST https://api.exotel.com/v1/Accounts/{SID}/Calls/connect

Headers:
  Authorization: Basic base64({API_KEY}:{API_TOKEN})

Body (form-encoded):
  From = caller_mobile (with country code)
  To = callee_mobile (with country code)  
  CallerId = exotel_virtual_number
  CallType = trans
```

### Flow Diagram

```text
User taps "Call" 
  -> Edge function receives request
  -> Validates numbers
  -> Calls Exotel Connect API
  -> Exotel dials User's phone first
  -> User picks up
  -> Exotel dials Delivery Partner
  -> Both connected via Exotel virtual number
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/auth/LoginForm.tsx` | Add Indian mobile validation |
| `src/components/auth/RegisterForm.tsx` | Add Indian mobile validation |
| `supabase/functions/send-2factor-otp/index.ts` | Add server-side mobile validation |
| `supabase/functions/exotel-click-to-call/index.ts` | New edge function |
| `supabase/config.toml` | Add exotel-click-to-call config |
| Database migration | Create `exotel_calls` table |
| `src/hooks/useExotelCall.ts` | New hook for Exotel call flow |
| Voice call UI components | Update to use Exotel instead of ZegoCloud |

### Secrets Required

- `EXOTEL_SID` - Your Exotel account SID
- `EXOTEL_API_KEY` - Exotel API key
- `EXOTEL_API_TOKEN` - Exotel API token
- `EXOTEL_CALLER_ID` - Your Exotel virtual/caller ID number

