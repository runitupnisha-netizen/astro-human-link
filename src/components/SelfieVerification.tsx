import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  RotateCcw,
  Upload,
  CheckCircle2,
  Clock,
  Loader2,
  BadgeCheck,
  AlertTriangle,
  Sun,
  Smile,
  Glasses,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { markSessionVerified } from "@/hooks/useVerificationGate";
import { motion, AnimatePresence } from "framer-motion";

type VerificationStatus = "none" | "pending" | "verified" | "rejected";
type Step = 1 | 2 | 3;

const TIPS: { icon: typeof Sun; label: string; ok: boolean }[] = [
  { icon: Sun, label: "Bright, even lighting", ok: true },
  { icon: Smile, label: "Face the camera, neutral expression", ok: true },
  { icon: EyeOff, label: "No hats, masks, or filters", ok: false },
  { icon: Glasses, label: "Remove sunglasses", ok: false },
];

const SelfieVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<VerificationStatus>("none");
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Check existing verification status
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("photo_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const s = data.status as VerificationStatus;
        setStatus(s);
        // If already verified, redirect to app
        if (s === "verified") {
          navigate("/", { replace: true });
          return;
        }
      }
      setLoading(false);
    };
    check();
  }, [user, navigate]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata before playing — critical on mobile
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
      setCameraActive(true);
      setCapturedImage(null);
      setStep(2);
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access to verify your profile.", variant: "destructive" });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center-crop and mirror for selfie
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setStep(3);
  }, [stopCamera]);

  const submitSelfie = useCallback(async () => {
    if (!capturedImage || !user) return;
    setSubmitting(true);

    try {
      // Convert data URL to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();

      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("verification-selfies")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      // Upsert verification record — auto-verify for now (can add AI review later)
      const { error: dbError } = await supabase
        .from("photo_verifications")
        .upsert({
          user_id: user.id,
          selfie_url: fileName,
          status: "verified",
          reviewed_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (dbError) throw dbError;

      setStatus("verified");
      setCapturedImage(null);
      markSessionVerified();
      toast({ title: "You're verified! ✨", description: "Your profile now shows a trust badge." });
      // Redirect to main app after a brief moment
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [capturedImage, user, toast]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border overflow-hidden">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-accent" />
          Photo Verification
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Take a selfie to earn a verified badge on your profile. This helps others know you're real.
        </p>

        <AnimatePresence mode="wait">
          {status === "verified" ? (
            <motion.div
              key="verified"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <p className="text-foreground font-semibold">You're verified!</p>
              <p className="text-sm text-muted-foreground text-center">
                Your trust badge is now visible on your profile, discover cards, and messages.
              </p>
            </motion.div>
          ) : status === "pending" ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-6 gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-semibold">Verification pending</p>
              <p className="text-sm text-muted-foreground text-center">
                Your selfie is being reviewed. This usually takes just a few moments.
              </p>
            </motion.div>
          ) : (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Camera viewfinder */}
              <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted mb-4">
                {cameraActive && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                )}
                {capturedImage && (
                  <img src={capturedImage} alt="Captured selfie" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {!cameraActive && !capturedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Camera className="w-12 h-12 opacity-30" />
                    <span className="text-sm">Camera preview</span>
                  </div>
                )}
                {/* Face guide overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-56 border-2 border-accent/40 rounded-[40%] border-dashed" />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {/* Controls */}
              <div className="flex justify-center gap-3">
                {!cameraActive && !capturedImage && (
                  <Button onClick={startCamera} className="gap-2" style={{ background: "var(--gradient-aurora)" }}>
                    <Camera className="w-4 h-4" /> Open Camera
                  </Button>
                )}
                {cameraActive && (
                  <Button onClick={capturePhoto} size="lg" className="gap-2 rounded-full px-8" style={{ background: "var(--gradient-golden)" }}>
                    <Camera className="w-5 h-5" /> Take Selfie
                  </Button>
                )}
                {capturedImage && (
                  <>
                    <Button variant="outline" onClick={startCamera} className="gap-2">
                      <RotateCcw className="w-4 h-4" /> Retake
                    </Button>
                    <Button onClick={submitSelfie} disabled={submitting} className="gap-2" style={{ background: "var(--gradient-aurora)" }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {submitting ? "Verifying…" : "Submit"}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default SelfieVerification;
