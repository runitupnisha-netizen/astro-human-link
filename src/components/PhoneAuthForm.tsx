import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

/** Strict E.164: + then 8-15 digits. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, {
    message: "Use international format, e.g. +14155551234",
  });

type Step = "phone" | "code";

const PhoneAuthForm = () => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      setPhoneError(result.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone: result.data },
      });
      if (error) throw error;
      toast.success("Code sent ✦", {
        description: `Check your texts at ${result.data}. The code is valid for 10 minutes.`,
      });
      setStep("code");
    } catch (err: any) {
      const msg = err?.context?.body
        ? (() => {
            try {
              return JSON.parse(err.context.body).error;
            } catch {
              return err.message;
            }
          })()
        : err?.message ?? "Could not send code. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone, code },
      });
      if (error) {
        const msg = error?.context?.body
          ? (() => {
              try {
                return JSON.parse(error.context.body).error;
              } catch {
                return error.message;
              }
            })()
          : error.message;
        throw new Error(msg);
      }
      const { email, token_hash } = (data ?? {}) as { email?: string; token_hash?: string };
      if (!email || !token_hash) throw new Error("Invalid verification response.");

      // Exchange the magic-link token for a real session.
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash,
      });
      if (verifyErr) throw verifyErr;

      toast.success("Phone verified ✨ Welcome to Stellara");
      navigate("/growth", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not verify code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCode("");
    setStep("phone");
  };

  if (step === "phone") {
    return (
      <motion.form
        onSubmit={handleSendCode}
        className="space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <Phone className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel"
            inputMode="tel"
            placeholder="+14155551234"
            value={phone}
            onChange={(e) => {
              const val = e.target.value;
              // Allow only + and digits.
              setPhone(val.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 16));
              if (phoneError) setPhoneError(null);
            }}
            className={`pl-10 h-12 bg-muted/50 border-border ${phoneError ? "border-destructive" : ""}`}
            required
            autoComplete="tel"
            aria-invalid={!!phoneError}
          />
          {phoneError && <p className="text-xs text-destructive mt-1.5 ml-1">{phoneError}</p>}
          <p className="text-xs text-muted-foreground mt-2 ml-1">
            We'll text a 6-digit code. Standard messaging rates may apply.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-13 min-h-[3.25rem] text-base font-semibold rounded-xl btn-shimmer"
          style={{ background: "var(--gradient-aurora)" }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
          ) : (
            <>
              Send code
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </motion.form>
    );
  }

  return (
    <motion.form
      onSubmit={handleVerifyCode}
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">Code sent to</p>
        <p className="font-medium text-foreground">{phone}</p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, ""))}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full h-13 min-h-[3.25rem] text-base font-semibold rounded-xl btn-shimmer"
        style={{ background: "var(--gradient-aurora)" }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
        ) : (
          <>
            Verify &amp; continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
        >
          <ArrowLeft className="w-3 h-3" />
          Use a different number
        </button>
      </div>
    </motion.form>
  );
};

export default PhoneAuthForm;