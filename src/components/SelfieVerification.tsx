import { useState, useCallback, useEffect } from "react";
import type { ChangeEvent } from "react";
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

  const [status, setStatus] = useState<VerificationStatus>("none");
  const [loading, setLoading] = useState(true);
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
        const s = data.status === "approved" ? "verified" : data.status === "pending" || data.status === "rejected" ? data.status as VerificationStatus : "none";
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

  const handleNativeSelfie = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setStep(1);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(typeof reader.result === "string" ? reader.result : null);
      setStep(3);
    };
    reader.onerror = () => {
      setStep(1);
      toast({ title: "Selfie unavailable", description: "Please try taking your selfie again.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const prepareForSelfie = () => {
    setCapturedImage(null);
    setStep(2);
  };

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

      // Submit for review. Badges only render after an approved status.
      const { error: dbError } = await supabase
        .from("photo_verifications")
        .upsert({
          user_id: user.id,
          selfie_url: fileName,
          status: "pending",
          reviewed_at: null,
        }, { onConflict: "user_id" });

      if (dbError) throw dbError;

      setStatus("pending");
      setCapturedImage(null);
      markSessionVerified();
      toast({ title: "Selfie submitted ✨", description: "Your verification badge will appear after review." });
      // Redirect to main app after a brief moment
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [capturedImage, user, toast]);

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
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-accent" />
            Photo Verification
          </h2>
          <StatusPill status={status} />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Take a quick selfie to earn a verified badge. It takes under a minute and helps others know you're real.
        </p>

        {(status === "none" || status === "rejected") && (
          <Stepper current={step} />
        )}

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
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={() => {
                  setStatus("none");
                  setStep(1);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Resubmit selfie
              </Button>
            </motion.div>
          ) : (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {status === "rejected" && (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive-foreground/90">
                    <p className="font-semibold text-destructive">Your last selfie wasn't accepted</p>
                    <p className="text-muted-foreground mt-0.5">
                      Try again with brighter lighting and a clear, unobstructed view of your face.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted mb-4 border border-border/50">
                {capturedImage ? (
                  <img src={capturedImage} alt="Captured selfie" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Camera className="w-12 h-12 opacity-30" />
                    <span className="text-sm">Selfie preview</span>
                  </div>
                )}
              </div>

              {/* Inline help — only when not yet captured */}
              {!capturedImage && (
                <div className="mb-4 rounded-xl bg-muted/40 border border-border/50 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" /> For best results
                  </p>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {TIPS.map(({ icon: Icon, label, ok }) => (
                      <li key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${ok ? "text-accent" : "text-destructive/80"}`} />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-3">
                {!capturedImage && (
                  <label className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <Camera className="w-4 h-4" />
                    {status === "rejected" ? "Try Again" : "Take Selfie"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onClick={prepareForSelfie}
                      onChange={handleNativeSelfie}
                    />
                  </label>
                )}
                {capturedImage && (
                  <>
                    <label className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <RotateCcw className="w-4 h-4" /> Retake
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onClick={prepareForSelfie}
                        onChange={handleNativeSelfie}
                      />
                    </label>
                    <Button onClick={submitSelfie} disabled={submitting} className="gap-2" style={{ background: "var(--gradient-aurora)" }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {submitting ? "Verifying…" : "Submit"}
                    </Button>
                  </>
                )}
              </div>

              <p className="text-[10px] text-center text-muted-foreground mt-4">
                Your selfie is private — used only to confirm you're a real person and never shown on your profile.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default SelfieVerification;

// ─── Helpers ────────────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: VerificationStatus }) => {
  const config = {
    none: { label: "Not started", classes: "bg-muted/60 text-muted-foreground border-border/60", Icon: Camera },
    pending: { label: "Pending review", classes: "bg-primary/15 text-primary border-primary/30", Icon: Clock },
    verified: { label: "Verified", classes: "bg-accent/15 text-accent border-accent/30", Icon: CheckCircle2 },
    rejected: { label: "Retry needed", classes: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertTriangle },
  }[status];
  const Icon = config.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider border rounded-full px-2 py-0.5 ${config.classes}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

const Stepper = ({ current }: { current: Step }) => {
  const steps = [
    { n: 1 as Step, label: "Prepare" },
    { n: 2 as Step, label: "Capture" },
    { n: 3 as Step, label: "Submit" },
  ];
  return (
    <div className="flex items-center justify-between mb-4 px-1" aria-label="Verification progress">
      {steps.map((s, idx) => {
        const isActive = current === s.n;
        const isDone = current > s.n;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-colors ${
                  isDone
                    ? "bg-accent text-accent-foreground border-accent"
                    : isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={`text-[10px] ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${current > s.n ? "bg-accent/60" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
