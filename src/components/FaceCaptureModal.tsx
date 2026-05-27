import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Camera, RefreshCw } from "lucide-react";

let modelsLoaded = false;
const MODEL_URL = "/face-models";

async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

interface FaceCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (descriptor: number[], imageDataUrl: string) => void;
  title?: string;
  mode?: "enroll" | "verify";
  requireLiveness?: boolean;
}

type Status =
  | { kind: "loading"; msg: string }
  | { kind: "error"; msg: string }
  | { kind: "warn"; msg: string }
  | { kind: "ok"; msg: string }
  | { kind: "blink"; msg: string }
  | { kind: "capturing"; msg: string };

const FaceCaptureModal = ({ open, onClose, onCapture, title = "Capture Face", mode = "enroll", requireLiveness = true }: FaceCaptureModalProps) => {
  const webcamRef = useRef<Webcam>(null);
  const stableSinceRef = useRef<number | null>(null);
  const capturedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  
  // Liveness tracking refs
  const blinkPhaseRef = useRef<"open" | "closing" | "blinked">("open");
  const blinkConfirmedRef = useRef(false);
  const livenessStartRef = useRef<number | null>(null);
  
  const [resetTick, setResetTick] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "loading", msg: "Loading face models..." });
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    capturedRef.current = false;
    stableSinceRef.current = null;
    blinkPhaseRef.current = "open";
    blinkConfirmedRef.current = false;
    livenessStartRef.current = null;
    setPermissionError(null);
    setStatus({ kind: "loading", msg: "Loading face models..." });
    
    loadModels()
      .then(() => setStatus({ kind: "warn", msg: "Position your face in the circle" }))
      .catch((e) => setStatus({ kind: "error", msg: "Failed to load models: " + e.message }));
  }, [open, resetTick]);

  const handleRetry = useCallback(() => {
    capturedRef.current = false;
    stableSinceRef.current = null;
    blinkPhaseRef.current = "open";
    blinkConfirmedRef.current = false;
    livenessStartRef.current = null;
    setStatus({ kind: "warn", msg: "Position your face in the circle" });
    setResetTick((t) => t + 1);
  }, []);

  // Detection loop
  useEffect(() => {
    if (!open || status.kind === "loading" || status.kind === "error" || permissionError) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || capturedRef.current) return;
      const webcam = webcamRef.current;
      const video = webcam?.video as HTMLVideoElement | undefined;
      
      if (!video || video.readyState !== 4) {
        rafRef.current = window.setTimeout(tick, 100) as any;
        return;
      }

      try {
        // Compute landmarks AND descriptors directly inside the main loop frame
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length === 0) {
          stableSinceRef.current = null;
          setStatus({ kind: "warn", msg: "No face detected" });
        } else if (detections.length > 1) {
          stableSinceRef.current = null;
          setStatus({ kind: "warn", msg: "Multiple faces detected — stay alone" });
        } else {
          const currentDetection = detections[0];
          const det = currentDetection.detection.box;
          const landmarks = currentDetection.landmarks;
          const descriptor = Array.from(currentDetection.descriptor);
          
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const cx = det.x + det.width / 2;
          const cy = det.y + det.height / 2;
          
          // Relaxed centering & sizing checks to compensate for webcam aspect ratios
          const centerOk = Math.abs(cx - vw / 2) < vw * 0.3 && Math.abs(cy - vh / 2) < vh * 0.35;
          const sizeOk = det.width > vw * 0.20 && det.width < vw * 0.85;

          if (!centerOk) {
            stableSinceRef.current = null;
            setStatus({ kind: "warn", msg: "Center your face in the circle" });
          } else if (!sizeOk) {
            stableSinceRef.current = null;
            setStatus({ kind: "warn", msg: det.width <= vw * 0.20 ? "Move a bit closer" : "Move back a bit" });
          } else {
            // Calculate Eye Aspect Ratio (EAR)
            const ear = computeEAR(landmarks);
            
            if (requireLiveness && !blinkConfirmedRef.current) {
              if (livenessStartRef.current == null) livenessStartRef.current = Date.now();
              const elapsedLive = Date.now() - livenessStartRef.current;
              
              // Dynamic state management for a clear blink
              if (blinkPhaseRef.current === "open" && ear < 0.22) {
                blinkPhaseRef.current = "closing";
              } else if (blinkPhaseRef.current === "closing" && ear > 0.25) {
                blinkPhaseRef.current = "blinked";
                blinkConfirmedRef.current = true;
              }
              
              if (!blinkConfirmedRef.current) {
                if (elapsedLive > 12000) { // 12-second window
                  livenessStartRef.current = null;
                  blinkPhaseRef.current = "open";
                  setStatus({ kind: "error", msg: "Liveness timeout. Please look at the camera and blink again." });
                  return;
                }
                setStatus({ kind: "blink", msg: "Please blink your eyes to verify" });
                if (!cancelled) rafRef.current = window.setTimeout(tick, 80) as any;
                return;
              }
            }

            // Face is safe, single, centered, and liveness confirmed
            if (stableSinceRef.current == null) stableSinceRef.current = Date.now();
            const elapsed = Date.now() - stableSinceRef.current;
            
            if (elapsed >= 400) {
              // Finalize directly without recalculating!
              capturedRef.current = true;
              setStatus({ kind: "capturing", msg: mode === "verify" ? "Verifying..." : "Capturing..." });
              
              const snapshot = webcam?.getScreenshot() || "";
              onCapture(descriptor, snapshot);
              onClose();
              return;
            } else {
              setStatus({ kind: "ok", msg: "Hold still..." });
            }
          }
        }
      } catch (e) {
        // catch transient errors safely
      }
      
      if (!cancelled && !capturedRef.current) {
        rafRef.current = window.setTimeout(tick, 100) as any;
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [open, status.kind, permissionError, requireLiveness, resetTick, onCapture, onClose, mode]);

  const handleUserMediaError = (err: string | DOMException) => {
    const msg = typeof err === "string" ? err : err.message;
    setPermissionError("Camera access denied or unavailable: " + msg);
  };

  const ringColor =
    status.kind === "ok" || status.kind === "capturing"
      ? "stroke-green-500"
      : status.kind === "blink"
      ? "stroke-blue-400"
      : status.kind === "error"
      ? "stroke-red-500"
      : status.kind === "warn"
      ? "stroke-amber-400"
      : "stroke-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-black aspect-square w-full">
          {permissionError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center gap-3">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm">{permissionError}</p>
              <p className="text-xs text-white/70">Allow camera access in your browser settings, then retry.</p>
            </div>
          ) : (
            <>
              <Webcam
                key={resetTick}
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user", width: 640, height: 640 }}
                onUserMediaError={handleUserMediaError}
                mirrored
                className="absolute inset-0 w-full h-full object-cover"
              />
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <mask id="oval-mask">
                    <rect width="100" height="100" fill="white" />
                    <ellipse cx="50" cy="50" rx="30" ry="38" fill="black" />
                  </mask>
                </defs>
                <rect width="100" height="100" fill="black" fillOpacity="0.45" mask="url(#oval-mask)" />
                <ellipse
                  cx="50" cy="50" rx="30" ry="38"
                  className={`${ringColor} transition-colors duration-200`}
                  fill="none"
                  strokeWidth="0.8"
                />
              </svg>
              {(status.kind === "loading" || status.kind === "capturing") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-4 py-3 space-y-3">
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              status.kind === "ok" || status.kind === "capturing"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : status.kind === "blink"
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                : status.kind === "error"
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : status.kind === "warn"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {status.kind === "ok" || status.kind === "capturing" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : status.kind === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : status.kind === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{status.msg}</span>
          </div>
          {status.kind === "error" ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceCaptureModal;

export function faceDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function computeEAR(landmarks: faceapi.FaceLandmarks68): number {
  const left = landmarks.getLeftEye();
  const right = landmarks.getRightEye();
  return (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;
}

function eyeAspectRatio(eye: { x: number; y: number }[]): number {
  if (eye.length < 6) return 1;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4]);
  const horizontal = 2 * dist(eye[0], eye[3]);
  if (horizontal === 0) return 1;
  return vertical / horizontal;
}
