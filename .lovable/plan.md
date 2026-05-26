## Plan: Face Authentication for Admin Employees

Replace the password-based admin employee registration and login flow with a face capture + face-match flow using the device camera.

---

### 1. Dependencies & Assets

- Install `react-webcam` (camera stream) and `face-api.js` (face detection + 128-d descriptor embedding).
- Add face-api.js model weights to `public/face-models/` (tiny_face_detector + face_landmark_68 + face_recognition). Loaded once on demand.

### 2. Database

New migration:
- Add column `face_descriptor jsonb` to `admin_employees` (stores the 128-float embedding array).
- Keep `password_hash` nullable / unused going forward (don't drop — backward compat for existing rows; new employees can have it set to a placeholder or made nullable).
- Migration will `ALTER COLUMN password_hash DROP NOT NULL`.

### 3. Shared Face Capture Modal

New component `src/components/FaceCaptureModal.tsx`:
- Opens fullscreen dialog with `react-webcam` preview.
- Circular/oval SVG overlay guiding face placement.
- Loads face-api.js models on mount (shows "Loading models..." state).
- Runs detection loop ~5fps using `TinyFaceDetector`.
- Real-time status banner:
  - "No face detected" (0 faces) — red
  - "Multiple faces detected" (>1) — red
  - "Move closer / center your face" (face box too small or off-center) — amber
  - "Low lighting detected" (mean luminance threshold) — amber
  - "Hold still..." (valid for <1.5s) — blue
  - Auto-capture once stable for ~1.5s with single centered well-lit face.
- On capture: compute 128-d descriptor via `faceapi.computeFaceDescriptor`, return descriptor + snapshot dataURL to parent, close modal.
- Handles camera permission denied with retry alert.
- Mode prop: `"enroll"` (returns descriptor) or `"verify"` (returns descriptor for matching).

### 4. Employee Creation Form (`EmployeeForm.tsx`)

- Remove password field, password regex, show/hide toggle, and `passwordChanged` logic.
- Add "Capture Face" button. When clicked opens `FaceCaptureModal` in enroll mode.
- After capture: show green badge "Face Captured Successfully" + thumbnail; allow recapture.
- On save:
  - New employee: require descriptor; insert with `face_descriptor` JSON; set `password_hash` to a random placeholder string (since column may still be NOT NULL until migration runs).
  - Edit: capture optional; if recaptured, update `face_descriptor`.

### 5. Admin Login (`AdminLogin.tsx` + `AdminAuthContext.tsx`)

- Replace password input with "Login with Face ID" button (enabled after valid 10-digit mobile entered).
- Flow:
  1. Fetch employee by mobile (active = true). If none → error.
  2. If `face_descriptor` is null → error "Face not enrolled. Contact admin."
  3. Open `FaceCaptureModal` in verify mode.
  4. On captured descriptor, compute Euclidean distance vs stored descriptor.
  5. If distance < 0.5 (configurable threshold) → success, save session, navigate to dashboard.
  6. Else show "Authentication Failed, Please Try Again" with retry button.
- `AdminAuthContext.login` signature changes to `login(mobile, faceDescriptor)`; password param removed.
- Remove `verify_password` RPC call; keep employee fetch.

### 6. Change Password Modal

- `AdminChangePasswordModal.tsx` becomes "Re-enroll Face" modal (or hidden entirely). Simplest: replace its trigger to open FaceCaptureModal and update `face_descriptor`.

### 7. UI/UX Details

- Circular overlay using SVG mask over video.
- Animated ring pulses green when face valid; red border when invalid.
- Status pill at bottom of modal with icon + message.
- Loading spinner with text "Analyzing face..." during model load and verification.
- Toast on success/failure.

### Technical Notes

- face-api.js models (~6MB total) served from `/public/face-models/`. Lazy-loaded only when modal opens; cached after first load.
- Descriptor is a `Float32Array(128)` → stored as plain number array in jsonb.
- Match threshold: 0.5 Euclidean distance (face-api.js standard).
- No biometric data leaves the client except the descriptor (not the raw image).
- Lighting check: sample center pixels of canvas frame, require mean luminance > 50 and < 230.
- Centering check: detection box center within 25% of frame center; box width between 30%–70% of frame width.

### Files

Created:
- `src/components/FaceCaptureModal.tsx`
- `public/face-models/*` (model weight files — fetched from face-api.js CDN and committed)
- new migration adding `face_descriptor` column + relaxing `password_hash`

Modified:
- `src/pages/dashboard/EmployeeForm.tsx`
- `src/pages/AdminLogin.tsx`
- `src/contexts/AdminAuthContext.tsx`
- `src/components/AdminChangePasswordModal.tsx` (re-enroll face)
- `package.json` (add `react-webcam`, `face-api.js`)
