import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

const COUNTRY_CODES: { code: string; label: string; flag: string }[] = [
  { code: "+1", label: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+34", label: "Spain", flag: "🇪🇸" },
  { code: "+39", label: "Italy", flag: "🇮🇹" },
  { code: "+31", label: "Netherlands", flag: "🇳🇱" },
  { code: "+46", label: "Sweden", flag: "🇸🇪" },
  { code: "+47", label: "Norway", flag: "🇳🇴" },
  { code: "+45", label: "Denmark", flag: "🇩🇰" },
  { code: "+353", label: "Ireland", flag: "🇮🇪" },
  { code: "+52", label: "Mexico", flag: "🇲🇽" },
  { code: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "+54", label: "Argentina", flag: "🇦🇷" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+82", label: "South Korea", flag: "🇰🇷" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+62", label: "Indonesia", flag: "🇮🇩" },
  { code: "+63", label: "Philippines", flag: "🇵🇭" },
  { code: "+64", label: "New Zealand", flag: "🇳🇿" },
  { code: "+27", label: "South Africa", flag: "🇿🇦" },
  { code: "+971", label: "United Arab Emirates", flag: "🇦🇪" },
];

const e164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, { message: "Enter a valid phone number." });

type Step = "phone" | "code";

const RESEND_SECONDS = 60;

const PhoneAuthForm = () => {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+1");
  const [localNumber, setLocalNumber] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [secondsLeft]);

  const buildE164 = () => {
    const digits = localNumber.replace(/\D/g, "");
    return `${countryCode}${digits}`;
  };

  const sendCode = async (phoneE164: string) => {
    const { error } = await supabase.functions.invoke("send-sms-otp", {
      body: { phone: phoneE164 },
    });
    if (error) {
      const msg = (error as any)?.context?.body
        ? (() => {
            try {
              return JSON.parse((error as any).context.body).error;
            } catch {
              return error.message;
            }
          })()
        : error.message;
      throw new Error(msg);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    const phoneE164 = buildE164();
    const parsed = e164Schema.safeParse(phoneE164);
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await sendCode(parsed.data);
      setFullPhone(parsed.data);
      setStep("code");
      setSecondsLeft(RESEND_SECONDS);
      toast.success("Code sent ✦", {
        description: `Check your texts at ${parsed.data}.`,
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return;
    setLoading(true);
    try {
      await sendCode(fullPhone);
      setSecondsLeft(RESEND_SECONDS);
      toast.success("New code sent ✦");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not resend code.");
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
        body: { phone: fullPhone, code },
      });
      if (error) {
        const msg = (error as any)?.context?.body
          ? (() => {
              try {
                return JSON.parse((error as any).context.body).error;
              } catch {
                return error.message;
              }
            })()
          : error.message;
        throw new Error(msg);
      }
      const { email, token_hash } = (data ?? {}) as { email?: string; token_hash?: string };
      if (!email || !token_hash) throw new Error("Invalid verification response.");

      const { error: verifyErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash,
      });
      if (verifyErr) throw verifyErr;

      // Persist phone on profile (best-effort).
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id;
        if (uid) {
          await supabase.from("profiles").update({ phone: fullPhone }).eq("user_id", uid);
        }
      } catch {
        /* non-fatal */
      }

      toast.success("Phone verified ✨ Welcome to Stellara");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not verify code. Try again.");
    } finally {
      setLoading(false);
    }
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
        <div className="flex gap-2">
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-[120px] h-12 bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.code + c.label} value={c.code}>
                  <span className="mr-2">{c.flag}</span>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="555 123 4567"
            value={localNumber}
            onChange={(e) => {
              setLocalNumber(e.target.value.replace(/[^\d\s().-]/g, "").slice(0, 18));
              if (phoneError) setPhoneError(null);
            }}
            className={`flex-1 h-12 bg-muted/50 border-border ${phoneError ? "border-destructive" : ""}`}
            required
            autoComplete="tel-national"
            aria-invalid={!!phoneError}
          />
        </div>
        {phoneError && <p className="text-xs text-destructive ml-1">{phoneError}</p>}
        <p className="text-xs text-muted-foreground ml-1">
          We'll text a 6-digit code. Standard messaging rates may apply.
        </p>

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
              Send Code
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
        <p className="font-medium text-foreground">{fullPhone}</p>
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
            Verify
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setCode("");
          }}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Change number
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading || secondsLeft > 0}
          className="text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
        </button>
      </div>
    </motion.form>
  );
};

export default PhoneAuthForm;
