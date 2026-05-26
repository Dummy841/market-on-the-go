import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Camera } from "lucide-react";

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
}

type Status =
  | { kind: "loading"; msg: string }
  | { kind: "error"; msg: string }
  | { kind: "warn"; msg: string }
  | { kind: "ok"; msg: string }
  | { kind: "capturing"; msg: string };

const FaceCaptureModal = ({ open, onClose, onCapture, title = "Capture Face", mode = "enroll" }: FaceCaptureModalProps) => {
  const webcamRef = useRef<Webcam>(null);
  const stableSinceRef = useRef<number | null>(null);
  const capturedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading", msg: "Loading face models..." });
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Load models when modal opens
  useEffect(() => {
    if (!open) return;
    capturedRef.current = false;
    stableSinceRef.current = null;
    setPermissionError(null);
    setStatus({ kind: "loading", msg: "Loading face models..." });
    loadModels()
      .then(() => setStatus({ kind: "warn", msg: "Position your face in the circle" }))
      .catch((e) => setStatus({ kind: "error", msg: "Failed to load models: " + e.message }));
  }, [open]);

  const doCapture = useCallback(async () => {
    if (capturedRef.current) return;
    const webcam = webcamRef.current;
    if (!webcam || !webcam.video) return;
    const video = webcam.video as HTMLVideoElement;
    capturedRef.current = true;
    setStatus({ kind: "capturing", msg: mode === "verify" ? "Verifying..." : "Capturing..." });
    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!result) {
        capturedRef.current = false;
        stableSinceRef.current = null;
        setStatus({ kind: "error", msg: "Could not capture face. Try again." });
        return;
      }
      const snapshot = webcam.getScreenshot() || "";
      const descriptor = Array.from(result.descriptor);
      onCapture(descriptor, snapshot);
      onClose();
    } catch (e: any) {
      capturedRef.current = false;
      setStatus({ kind: "error", msg: "Capture failed: " + e.message });
    }
  }, [onCapture, onClose, mode]);

  // Detection loop
  useEffect(() => {
    if (!open || status.kind === "loading" || status.kind === "error" || permissionError) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || capturedRef.current) return;
      const webcam = webcamRef.current;
      const video = webcam?.video as HTMLVideoElement | undefined;
      if (!video || video.readyState !== 4) {
        rafRef.current = window.setTimeout(tick, 200) as any;
        return;
      }

      try {
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        );

        if (detections.length === 0) {
          stableSinceRef.current = null;
          setStatus({ kind: "warn", msg: "No face detected" });
        } else if (detections.length > 1) {
          stableSinceRef.current = null;
          setStatus({ kind: "error", msg: "Multiple faces detected" });
        } else {
          const det = detections[0].box;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const cx = det.x + det.width / 2;
          const cy = det.y + det.height / 2;
          const centerOk = Math.abs(cx - vw / 2) < vw * 0.2 && Math.abs(cy - vh / 2) < vh * 0.25;
          const sizeOk = det.width > vw * 0.25 && det.width < vw * 0.75;

          // Lighting check (sample center pixels)
          let lightingOk = true;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 80; canvas.height = 80;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(video, det.x, det.y, det.width, det.height, 0, 0, 80, 80);
            const data = ctx.getImageData(0, 0, 80, 80).data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
              sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            const mean = sum / (data.length / 4);
            lightingOk = mean > 50 && mean < 235;
            if (!lightingOk) {
              stableSinceRef.current = null;
              setStatus({ kind: "warn", msg: mean <= 50 ? "Too dark — improve lighting" : "Too bright" });
            }
          } catch {}

          if (!centerOk) {
            stableSinceRef.current = null;
            setStatus({ kind: "warn", msg: "Center your face in the circle" });
          } else if (!sizeOk) {
            stableSinceRef.current = null;
            setStatus({ kind: "warn", msg: det.width <= vw * 0.25 ? "Move closer" : "Move back" });
          } else if (lightingOk) {
            if (stableSinceRef.current == null) stableSinceRef.current = Date.now();
            const elapsed = Date.now() - stableSinceRef.current;
            if (elapsed >= 1200) {
              setStatus({ kind: "ok", msg: "Hold still..." });
              await doCapture();
              return;
            } else {
              setStatus({ kind: "ok", msg: `Hold still... ${Math.ceil((1200 - elapsed) / 300)}` });
            }
          }
        }
      } catch (e) {
        // ignore transient errors
      }
      if (!cancelled) rafRef.current = window.setTimeout(tick, 200) as any;
    };

    tick();
    return () => {
      cancelled = true;
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [open, status.kind, permissionError, doCapture]);

  const handleUserMediaError = (err: string | DOMException) => {
    const msg = typeof err === "string" ? err : err.message;
    setPermissionError("Camera access denied or unavailable: " + msg);
  };

  const ringColor =
    status.kind === "ok" || status.kind === "capturing"
      ? "stroke-green-500"
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
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user", width: 640, height: 640 }}
                onUserMediaError={handleUserMediaError}
                mirrored
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Oval guide */}
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
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceCaptureModal;

// Euclidean distance helper for matching
export function faceDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}