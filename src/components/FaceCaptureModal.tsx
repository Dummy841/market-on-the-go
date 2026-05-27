import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Camera, RefreshCw, ShieldCheck } from "lucide-react";

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

type MoveTask = "TURN_RIGHT" | "TURN_LEFT" | "BLINK";

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
  | { kind: "challenge"; msg: string };

const FaceCaptureModal = ({ open, onClose, onCapture, title = "Capture Face", mode = "enroll" }: FaceCaptureModalProps) => {
  const webcamRef = useRef<Webcam>(null);
  const capturedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  
  // Challenge State Tracking
  const [challenges, setChallenges] = useState<MoveTask[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(5); // 5 seconds per move
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tracking references for movement thresholds
  const blinkPhaseRef = useRef<"open" | "closing" | "blinked">("open");
  const stepCompletedRef = useRef<boolean>(false);
  const capturedDescriptorRef = useRef<number[] | null>(null);

  const [resetTick, setResetTick] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "loading", msg: "Loading face models..." });
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 1. Initialize Challenges based on enrollment or verification mode
  useEffect(() => {
    if (!open) return;
    capturedRef.current = false;
    stepCompletedRef.current = false;
    capturedDescriptorRef.current = null;
    setCurrentStepIdx(0);
    setTimeLeft(3);
    blinkPhaseRef.current = "open";
    setPermissionError(null);
    setStatus({ kind: "loading", msg: "Initializing biometric parameters..." });

    // Enrolling follows a fixed path; verification shuffles the array dynamically every single time
    let baseMoves: MoveTask[] = ["TURN_RIGHT", "TURN_LEFT", "BLINK"];
    if (mode === "verify") {
      // Complete robust Fisher-Yates shuffle array routine to guarantee randomization on login
      const shuffled = [...baseMoves];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      baseMoves = shuffled;
    }
    setChallenges(baseMoves);

    loadModels()
      .then(() => setStatus({ kind: "warn", msg: "Align your face in the circle to begin" }))
      .catch((e) => setStatus({ kind: "error", msg: "Failed to load models: " + e.message }));
  }, [open, resetTick, mode]);

  // 2. Active 3-Second Countdown Handler per step
  useEffect(() => {
    if (!open || status.kind === "loading" || status.kind === "error" || challenges.length === 0 || capturedRef.current) return;

    if (status.kind === "challenge" || status.kind === "ok" || status.kind === "warn") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            capturedRef.current = true;
            setStatus({ kind: "error", msg: `Liveness failed: Timeout on current instruction.` });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, currentStepIdx, challenges, status.kind]);

  const handleRetry = useCallback(() => {
    capturedRef.current = false;
    stepCompletedRef.current = false;
    capturedDescriptorRef.current = null;
    setCurrentStepIdx(0);
    setTimeLeft(3);
    blinkPhaseRef.current = "open";
    setStatus({ kind: "warn", msg: "Align your face in the circle to begin" });
    setResetTick((t) => t + 1);
  }, []);

  // Return user-friendly display strings for current moves
  const getChallengeInstruction = (task: MoveTask) => {
    switch (task) {
      case "TURN_RIGHT": return "👉 Turn your head to the Right";
      case "TURN_LEFT": return "👈 Turn your head to the Left";
      case "BLINK": return "👀 Blink your eyes cleanly";
    }
  };

  // 3. Central Computer Core Frame Real-time Loop Evaluation
  useEffect(() => {
    if (!open || status.kind === "loading" || status.kind === "error" || permissionError || challenges.length === 0) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || capturedRef.current) return;
      const webcam = webcamRef.current;
      const video = webcam?.video as HTMLVideoElement | undefined;
      
      if (!video || video.readyState !== 4) {
        rafRef.current = window.setTimeout(tick, 50) as any;
        return;
      }

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length === 0) {
          setStatus({ kind: "warn", msg: "No face detected" });
        } else if (detections.length > 1) {
          capturedRef.current = true;
          setStatus({ kind: "error", msg: "Liveness Failed: Multiple people detected." });
          return;
        } else {
          const currentDetection = detections[0];
          const det = currentDetection.detection.box;
          const landmarks = currentDetection.landmarks;
          
          if (!capturedDescriptorRef.current) {
            capturedDescriptorRef.current = Array.from(currentDetection.descriptor);
          }

          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const cx = det.x + det.width / 2;
          const cy = det.y + det.height / 2;
          
          const centerOk = Math.abs(cx - vw / 2) < vw * 0.35 && Math.abs(cy - vh / 2) < vh * 0.4;

          if (!centerOk && currentStepIdx === 0) {
            setStatus({ kind: "warn", msg: "Center your face in the circle to start" });
          } else {
            const activeTask = challenges[currentStepIdx];
            setStatus({ kind: "challenge", msg: `${getChallengeInstruction(activeTask)} (${timeLeft}s left)` });

            if (activeTask === "BLINK") {
              const ear = computeEAR(landmarks);
              
              // Adjusted and relaxed EAR thresholds for consistent real-time verification
              if (blinkPhaseRef.current === "open" && ear < 0.23) {
                blinkPhaseRef.current = "closing";
              } else if (blinkPhaseRef.current === "closing" && ear > 0.25) {
                blinkPhaseRef.current = "blinked";
                stepCompletedRef.current = true;
              }
            } else {
              // Mathematical Head Rotation Mapping
              const jawPoints = landmarks.getJawOutline();
              const nosePoints = landmarks.getNose();
              const leftJawX = jawPoints[0].x;
              const rightJawX = jawPoints[16].x;
              const noseTipX = nosePoints[6].x;

              const totalWidth = rightJawX - leftJawX;
              const nosePositionRatio = (noseTipX - leftJawX) / totalWidth;

              if (activeTask === "TURN_RIGHT" && nosePositionRatio < 0.38) {
                stepCompletedRef.current = true;
              } else if (activeTask === "TURN_LEFT" && nosePositionRatio > 0.62) {
                stepCompletedRef.current = true;
              }
            }

            // Move to next task or finish capture upon successful gesture check
            if (stepCompletedRef.current) {
              if (timerRef.current) clearInterval(timerRef.current);
              stepCompletedRef.current = false;
              blinkPhaseRef.current = "open";

              if (currentStepIdx + 1 < challenges.length) {
                setTimeLeft(3); // Reset challenge window back to 3 seconds
                setCurrentStepIdx((prev) => prev + 1);
              } else {
                // All 3 validation phases passed successfully!
                capturedRef.current = true;
                setStatus({ kind: "ok", msg: "Security Verification Complete!" });
                
                const snapshot = webcam?.getScreenshot() || "";
                onCapture(capturedDescriptorRef.current || [], snapshot);
                
                setTimeout(() => {
                  onClose();
                }, 800);
                return;
              }
            }
          }
        }
      } catch (e) {
        // block transient frame skip exceptions
      }
      
      if (!cancelled && !capturedRef.current) {
        // Sped up frame check cycle intervals from 80ms to 40ms during active assessments
        rafRef.current = window.setTimeout(tick, 40) as any;
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [open, challenges, currentStepIdx, timeLeft, status.kind, permissionError, resetTick, onCapture, onClose]);

  const handleUserMediaError = (err: string | DOMException) => {
    const msg = typeof err === "string" ? err : err.message;
    setPermissionError("Camera Access Interrupted: " + msg);
  };

  const ringColor =
    status.kind === "ok"
      ? "stroke-green-500"
      : status.kind === "challenge"
      ? "stroke-blue-500"
      : status.kind === "error"
      ? "stroke-red-500"
      : status.kind === "warn"
      ? "stroke-amber-400"
      : "stroke-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <ShieldCheck className="h-5 w-5 text-blue-500" /> 
            {mode === "enroll" ? "Biometric Secure Enrollment" : "Dynamic Face Liveness Login"}
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-black aspect-square w-full">
          {permissionError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center gap-3">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm">{permissionError}</p>
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
                    <ellipse cx="50" cy="50" rx="32" ry="38" fill="black" />
                  </mask>
                </defs>
                <rect width="100" height="100" fill="black" fillOpacity="0.5" mask="url(#oval-mask)" />
                <ellipse
                  cx="50" cy="50" rx="32" ry="38"
                  className={`${ringColor} transition-colors duration-200`}
                  fill="none"
                  strokeWidth="1"
                />
              </svg>

              <div className="absolute top-3 left-3 right-3 flex justify-between gap-2 pointer-events-none">
                {challenges.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      idx < currentStepIdx 
                        ? "bg-green-500 shadow" 
                        : idx === currentStepIdx && status.kind === "challenge"
                        ? "bg-blue-500"
                        : "bg-white/30"
                    }`}
                  />
                ))}
              </div>

              {status.kind === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-4 py-3 space-y-3">
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold tracking-wide shadow-sm ${
              status.kind === "ok"
                ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                : status.kind === "challenge"
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                : status.kind === "error"
                ? "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                : status.kind === "warn"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{status.msg}</span>
          </div>
          {status.kind === "error" ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" /> Restart Assessment
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
