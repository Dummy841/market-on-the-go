## Plan: Liveness Face Auth + Show Superadmin + Delivery Partner Face Login

### 1. Show Superadmin in Employees Table
**File: `src/pages/dashboard/Employees.tsx`**
- Remove the `.filter((e) => e.mobile !== SUPERADMIN_MOBILE)` so 9502395261 shows up in the list with a "Super Admin" badge.
- Disable the deactivate button for the superadmin row (cannot be disabled).

### 2. Liveness Detection in `FaceCaptureModal.tsx`

Current problems:
- "Could not capture face" error has only a Cancel button → must add a **Retry** button.
- Auto-capture sometimes fires even with bad detection → enforce strict single-face + liveness gating.
- Photo spoofing possible → require **eye blink** as a liveness proof.

New flow:
1. Load `tinyFaceDetector + faceLandmark68 + faceRecognition` models (already loaded). Use landmarks for EAR (Eye Aspect Ratio) blink detection.
2. Replace the "1.2s stable" auto-capture with a multi-step liveness sequence:
   - **Step A — Position face**: single centered face, good lighting (existing logic).
   - **Step B — Blink detection**: Show banner "Please blink your eyes". Compute EAR from landmarks (points 36-41 left eye, 42-47 right eye). Track EAR over frames; require at least 1 transition from open (EAR > 0.25) → closed (EAR < 0.18) → open (EAR > 0.25) within 6 seconds.
   - **Step C — Capture**: Once blink confirmed AND still single face AND still centered, run `withFaceDescriptor()` and return.
3. **Strict multi-face guard**: in `doCapture`, re-run `detectAllFaces` first; if length ≠ 1, abort and return to Step A with error "Only one face allowed".
4. **Error state UI**: when status is `error`, show both **Retry** and **Cancel** buttons. Retry resets `capturedRef`, `stableSinceRef`, blink state, and returns to Step A.
5. Add a `requireLiveness` prop (default `true`). Enrollment can pass `requireLiveness={false}` if desired, but per request we keep it `true` for both enroll and verify.

EAR formula:
```
EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
```

### 3. Delivery Partner Face Authentication

**Database (migration):**
- Add `face_descriptor jsonb` column to `delivery_partners` table.

**File: `src/pages/dashboard/DeliveryPartners.tsx` (admin side)**
- In the create / edit delivery partner form, replace the password field with the same "Capture Face" workflow used in `EmployeeForm.tsx` (reuse `FaceCaptureModal`).
- Save the 128-d descriptor into `delivery_partners.face_descriptor`.

**File: `src/components/CreateDeliveryPartnerForm.tsx`**
- Same change — replace password input with face capture button + status indicator.

**File: `src/pages/DeliveryPartnerLogin.tsx`**
- Replace the password input with a "Login with Face ID" button.
- On click, open `FaceCaptureModal` in `mode="verify"` with liveness enforced.
- On capture, fetch partner by mobile, run Euclidean distance check against stored `face_descriptor` with threshold `< 0.55`.
- On match: save `delivery_partner` to localStorage and navigate to `/delivery-dashboard`. On mismatch: toast "Authentication Failed".

### 4. Files Changed

| File | Change |
|------|--------|
| `src/pages/dashboard/Employees.tsx` | Show superadmin row, disable deactivate for it |
| `src/components/FaceCaptureModal.tsx` | Blink-based liveness, strict single-face guard, Retry button |
| `src/pages/DeliveryPartnerLogin.tsx` | Password → Face ID login |
| `src/components/CreateDeliveryPartnerForm.tsx` | Password → Face capture |
| `src/pages/dashboard/DeliveryPartners.tsx` | Edit form: Face capture (re-enroll) |
| New migration | Add `face_descriptor jsonb` to `delivery_partners` |

### Notes / Limitations
- Browser-based liveness (blink + single face) significantly reduces photo-spoofing but is not bank-grade — a video replay on a phone screen could still potentially pass blink detection. True anti-spoofing needs a server-side liveness SDK (AWS Rekognition Liveness, FaceTec, etc.). I'll add a note in the UI so users know to do the blink in front of the camera, not via a recording.
- All face detection runs client-side using the existing `face-api.js` models already in `/public/face-models`. No new model downloads required.
