import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Heart, Loader2, Trash2, Star, Moon, Sunrise, Compass } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import SparkleLoader from "@/components/SparkleLoader";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import SynastryChart from "@/components/SynastryChart";
import { toast } from "sonner";

type Reading = {
  id: string | null;
  theirSun: string;
  score: number;
  summary: string;
  highlight: string;
  theirName: string;
  userSun: string | null;
  userMoon: string | null;
  userRising: string | null;
  userHdType: string | null;
  userHdAuthority: string | null;
  chartHighlights: string[];
  humanDesignNotes: string[];
};

type SavedCheck = {
  id: string;
  their_name: string | null;
  compatibility_score: number | null;
  created_at: string;
};

const FREE_MONTHLY_LIMIT = 2;

// 18+ guard — chart must belong to an adult
const eighteenYearsAgo = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();
const earliestBirthDate = new Date("1900-01-01");

const checkSchema = z.object({
  theirName: z
    .string()
    .trim()
    .max(40, "Name must be 40 characters or fewer")
    .regex(/^[\p{L}\p{M}'’\-\s.]*$/u, "Use letters, spaces, hyphens or apostrophes only"),
  birthDate: z
    .string()
    .min(1, "Birth date is required")
    .refine((v) => !isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => new Date(v) >= earliestBirthDate, "Date must be after 1900")
    .refine((v) => new Date(v) <= eighteenYearsAgo, "Person must be 18 or older"),
  birthTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)")
    .or(z.literal("")),
  birthPlace: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(120, "City must be 120 characters or fewer"),
  confirmed: z.literal(true, {
    message: "Please confirm whose chart you're reading",
  }),
});

type FieldErrors = Partial<Record<"theirName" | "birthDate" | "birthTime" | "birthPlace" | "confirmed", string>>;

const CheckConnection = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { subscribed: isPremium } = usePremium();

  const [step, setStep] = useState<"form" | "loading" | "result">("form");
  const [theirName, setTheirName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [skipTime, setSkipTime] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [reading, setReading] = useState<Reading | null>(null);
  const [saved, setSaved] = useState<SavedCheck[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [monthCount, setMonthCount] = useState(0);

  // Prefill from a saved check (?rerun=<id>) or shortcut params (?name=&date=&time=&place=)
  useEffect(() => {
    if (!user) return;
    const rerunId = searchParams.get("rerun");
    if (rerunId) {
      (async () => {
        const { data } = await supabase
          .from("connection_checks")
          .select("their_name,their_birth_date,their_birth_time,their_birth_place")
          .eq("id", rerunId)
          .maybeSingle();
        if (data) {
          setTheirName(data.their_name ?? "");
          setBirthDate(data.their_birth_date ?? "");
          setBirthTime(data.their_birth_time ?? "");
          setSkipTime(!data.their_birth_time);
          setBirthPlace(data.their_birth_place ?? "");
          toast.success(`Loaded ${data.their_name || "previous check"} — review and confirm to rerun`);
        }
        setSearchParams({}, { replace: true });
      })();
    }
  }, [user, searchParams, setSearchParams]);

  // Load saved readings + this month's usage
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("connection_checks")
        .select("id,their_name,compatibility_score,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setSaved(data ?? []);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("connection_checks")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString());
      setMonthCount(count ?? 0);
    })();
  }, [user]);

  const limitReached = !isPremium && monthCount >= FREE_MONTHLY_LIMIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = checkSchema.safeParse({
      theirName,
      birthDate,
      birthTime: skipTime ? "" : birthTime,
      birthPlace,
      confirmed,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (limitReached) {
      toast.error("You've used your 2 free connections this month");
      return;
    }

    setStep("loading");
    const startedAt = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke("check-connection", {
        body: {
          theirName: theirName.trim(),
          birthDate,
          birthTime: skipTime ? null : birthTime || null,
          birthPlace,
        },
      });
      if (error) throw error;

      // Minimum 3-second delay so the loading moment feels intentional
      const elapsed = Date.now() - startedAt;
      if (elapsed < 3000) {
        await new Promise((r) => setTimeout(r, 3000 - elapsed));
      }

      setReading({
        id: data.id,
        theirSun: data.theirSun,
        score: data.score,
        summary: data.summary,
        highlight: data.highlight,
        theirName: theirName.trim() || "Them",
        userSun: data.userSun ?? null,
        userMoon: data.userMoon ?? null,
        userRising: data.userRising ?? null,
        userHdType: data.userHdType ?? null,
        userHdAuthority: data.userHdAuthority ?? null,
        chartHighlights: Array.isArray(data.chartHighlights) ? data.chartHighlights : [],
        humanDesignNotes: Array.isArray(data.humanDesignNotes) ? data.humanDesignNotes : [],
      });
      setMonthCount((c) => c + 1);
      setStep("result");

      // Refresh saved list
      const { data: refreshed } = await supabase
        .from("connection_checks")
        .select("id,their_name,compatibility_score,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setSaved(refreshed ?? []);
    } catch (err) {
      console.error("[CheckConnection] error", err);
      toast.error("Lyra couldn't read this connection right now. Try again.");
      setStep("form");
    }
  };

  const reset = () => {
    setReading(null);
    setTheirName("");
    setBirthDate("");
    setBirthTime("");
    setSkipTime(false);
    setBirthPlace("");
    setConfirmed(false);
    setErrors({});
    setStep("form");
  };

  const deleteCheck = async (id: string) => {
    await supabase.from("connection_checks").delete().eq("id", id);
    setSaved((s) => s.filter((c) => c.id !== id));
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-y-auto"
      style={{ backgroundColor: "#0c0b13" }}
    >
      {/* Cosmic backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(109, 40, 217, 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 90%, rgba(77, 58, 92, 0.25), transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-[#4d3a5c]/40 text-[#7a6a9a] hover:text-[#c9b8f0] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowSaved(true)}
          className="text-xs px-3 py-1.5 rounded-full transition-colors"
          style={{
            color: "#c9b8f0",
            backgroundColor: "rgba(77, 58, 92, 0.4)",
            border: "1px solid rgba(208, 180, 247, 0.2)",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          My Connections
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pb-32">
        <div className="w-full max-w-md mt-4">
          {step === "form" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1
                className="text-3xl text-center"
                style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff" }}
              >
                Check a Connection
              </h1>
              <p
                className="text-sm text-center mt-3 leading-relaxed"
                style={{ color: "#a89ac8", fontFamily: "Poppins, sans-serif" }}
              >
                Enter the birth details of <span style={{ color: "#d0b4f7" }}>the person you're curious about</span> — they don't need to be on Stellara.
              </p>

              <div
                className="mt-6 rounded-2xl p-4 flex items-start gap-2"
                style={{
                  backgroundColor: "rgba(77, 58, 92, 0.4)",
                  border: "1px solid rgba(208, 180, 247, 0.22)",
                }}
              >
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d0b4f7" }} />
                <p className="text-sm" style={{ color: "#d0b4f7", fontFamily: "Lora, Georgia, serif" }}>
                  <span className="opacity-70">Lyra: </span>
                  Whose chart am I reading? Make sure these details are <em>theirs</em>, not yours — I'll use your own chart automatically.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: "#a89ac8" }}>
                    Their name <span className="opacity-50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={theirName}
                    onChange={(e) => {
                      setTheirName(e.target.value);
                      if (errors.theirName) setErrors((p) => ({ ...p, theirName: undefined }));
                    }}
                    placeholder="e.g. Jordan — a name personalizes the reading"
                    maxLength={40}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      backgroundColor: "rgba(77, 58, 92, 0.35)",
                      border: errors.theirName
                        ? "1px solid rgba(251, 113, 133, 0.6)"
                        : "1px solid rgba(208, 180, 247, 0.2)",
                      color: "#e0d4ff",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  />
                  {errors.theirName && (
                    <p className="text-[11px] mt-1.5" style={{ color: "#fda4af" }}>
                      {errors.theirName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: "#a89ac8" }}>
                    Their date of birth <span className="text-rose-300">*</span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    max={eighteenYearsAgo.toISOString().slice(0, 10)}
                    min="1900-01-01"
                    onChange={(e) => {
                      setBirthDate(e.target.value);
                      if (errors.birthDate) setErrors((p) => ({ ...p, birthDate: undefined }));
                    }}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      backgroundColor: "rgba(77, 58, 92, 0.35)",
                      border: errors.birthDate
                        ? "1px solid rgba(251, 113, 133, 0.6)"
                        : "1px solid rgba(208, 180, 247, 0.2)",
                      color: "#e0d4ff",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  />
                  {errors.birthDate && (
                    <p className="text-[11px] mt-1.5" style={{ color: "#fda4af" }}>
                      {errors.birthDate}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs" style={{ color: "#a89ac8" }}>
                      Their time of birth
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSkipTime((v) => !v);
                        setErrors((p) => ({ ...p, birthTime: undefined }));
                      }}
                      className="text-xs underline"
                      style={{ color: "#d0b4f7" }}
                    >
                      {skipTime ? "I know it" : "I don't know"}
                    </button>
                  </div>
                  {!skipTime ? (
                    <>
                      <input
                        type="time"
                        value={birthTime}
                        onChange={(e) => {
                          setBirthTime(e.target.value);
                          if (errors.birthTime) setErrors((p) => ({ ...p, birthTime: undefined }));
                        }}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{
                          backgroundColor: "rgba(77, 58, 92, 0.35)",
                          border: errors.birthTime
                            ? "1px solid rgba(251, 113, 133, 0.6)"
                            : "1px solid rgba(208, 180, 247, 0.2)",
                          color: "#e0d4ff",
                          fontFamily: "Poppins, sans-serif",
                        }}
                      />
                      {errors.birthTime && (
                        <p className="text-[11px] mt-1.5" style={{ color: "#fda4af" }}>
                          {errors.birthTime}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] px-1" style={{ color: "#7a6a9a" }}>
                      Without birth time, Moon and Rising are approximate.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: "#a89ac8" }}>
                    Their city of birth <span className="text-rose-300">*</span>
                  </label>
                  <LocationAutocomplete
                    value={birthPlace}
                    onChange={(v) => {
                      setBirthPlace(v);
                      if (errors.birthPlace) setErrors((p) => ({ ...p, birthPlace: undefined }));
                    }}
                    placeholder="City, country"
                  />
                  {errors.birthPlace && (
                    <p className="text-[11px] mt-1.5" style={{ color: "#fda4af" }}>
                      {errors.birthPlace}
                    </p>
                  )}
                </div>

                {/* Confirmation — prevents accidentally reading your own chart twice */}
                <label
                  className="flex items-start gap-2.5 rounded-xl p-3 cursor-pointer select-none"
                  style={{
                    backgroundColor: "rgba(77, 58, 92, 0.3)",
                    border: errors.confirmed
                      ? "1px solid rgba(251, 113, 133, 0.55)"
                      : "1px solid rgba(208, 180, 247, 0.18)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => {
                      setConfirmed(e.target.checked);
                      if (errors.confirmed) setErrors((p) => ({ ...p, confirmed: undefined }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded accent-[#d0b4f7] shrink-0"
                  />
                  <span
                    className="text-[12px] leading-relaxed"
                    style={{ color: "#c9b8f0", fontFamily: "Poppins, sans-serif" }}
                  >
                    I confirm these details belong to{" "}
                    <strong style={{ color: "#e0d4ff" }}>
                      {theirName.trim() || "the person I'm checking"}
                    </strong>
                    , not me, and I have a real-world reason to read their chart.
                  </span>
                </label>
                {errors.confirmed && (
                  <p className="text-[11px] -mt-2" style={{ color: "#fda4af" }}>
                    {errors.confirmed}
                  </p>
                )}

                {limitReached ? (
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      backgroundColor: "rgba(217, 119, 6, 0.12)",
                      border: "1px solid rgba(249, 214, 151, 0.35)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "#f9d697", fontFamily: "Lora, Georgia, serif" }}>
                      You've used your 2 free connections this month.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/premium")}
                      className="mt-3 w-full rounded-full py-3 text-sm font-medium"
                      style={{
                        background: "linear-gradient(135deg, #f9d697 0%, #d4a854 100%)",
                        color: "#0c0b13",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Unlock with Pro ✦
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!birthDate || !birthPlace || !confirmed}
                    className="w-full rounded-full py-3.5 text-sm font-medium transition-opacity disabled:opacity-50"
                    style={{
                      background: "radial-gradient(circle at 35% 30%, #8b5cf6, #6d28d9)",
                      color: "#ffffff",
                      boxShadow: "0 0 20px rgba(127, 119, 221, 0.45)",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Read Our Connection ✦
                  </button>
                )}

                {!isPremium && !limitReached && (
                  <p className="text-[11px] text-center" style={{ color: "#7a6a9a" }}>
                    {FREE_MONTHLY_LIMIT - monthCount} of {FREE_MONTHLY_LIMIT} free checks remaining this month
                  </p>
                )}
              </form>
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <SparkleLoader size={44} />
              <p
                className="mt-6 text-sm"
                style={{ color: "#c9b8f0", fontFamily: "Lora, Georgia, serif" }}
              >
                Lyra is reading your connection…
              </p>
            </motion.div>
          )}

          {step === "result" && reading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              {/* Score circle */}
              <div className="flex flex-col items-center pt-2">
                <div
                  className="relative w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(#d0b4f7 ${reading.score * 3.6}deg, rgba(208,180,247,0.15) 0)`,
                  }}
                >
                  <div
                    className="absolute inset-2 rounded-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: "#0c0b13" }}
                  >
                    <span
                      className="text-3xl"
                      style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif" }}
                    >
                      {reading.score}%
                    </span>
                    <span className="text-[10px] mt-0.5" style={{ color: "#7a6a9a" }}>
                      cosmic alignment
                    </span>
                  </div>
                </div>
                <p
                  className="mt-4 text-base"
                  style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif" }}
                >
                  You & {reading.theirName}
                </p>
                <p className="text-xs mt-1" style={{ color: "#a89ac8" }}>
                  Their Sun: {reading.theirSun}
                </p>
              </div>

              {/* Highlight chip */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  backgroundColor: "rgba(109, 40, 217, 0.18)",
                  border: "1px solid rgba(208, 180, 247, 0.25)",
                }}
              >
                <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#d0b4f7" }}>
                  ✦ The heart of it
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif" }}
                >
                  {reading.highlight}
                </p>
              </div>

              {/* Lyra summary */}
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "rgba(77, 58, 92, 0.4)",
                  border: "1px solid rgba(208, 180, 247, 0.2)",
                }}
              >
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#c9b8f0", fontFamily: "Lora, Georgia, serif" }}
                >
                  <span className="opacity-70">Lyra: </span>
                  {reading.summary}
                </p>
              </div>

              {/* Synastry wheel — only renders if user has at least their Sun */}
              {reading.userSun && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(77, 58, 92, 0.35)",
                    border: "1px solid rgba(208, 180, 247, 0.18)",
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-wider mb-3 text-center"
                    style={{ color: "#d0b4f7" }}
                  >
                    ✦ Synastry wheel
                  </p>
                  <div className="flex justify-center">
                    <SynastryChart
                      mySigns={{
                        sun: reading.userSun,
                        moon: reading.userMoon,
                        rising: reading.userRising,
                      }}
                      theirSigns={{ sun: reading.theirSun, moon: null, rising: null }}
                      score={reading.score}
                    />
                  </div>
                  <div
                    className="mt-3 text-center text-[11px] space-y-0.5"
                    style={{ color: "#a89ac8", fontFamily: "Poppins, sans-serif" }}
                  >
                    <p>
                      <span style={{ color: "#d0b4f7" }}>You:</span> ☉ {reading.userSun}
                      {reading.userMoon ? ` · ☽ ${reading.userMoon}` : ""}
                      {reading.userRising ? ` · ↗ ${reading.userRising}` : ""}
                    </p>
                    <p>
                      <span style={{ color: "#f9d697" }}>Them:</span> ☉ {reading.theirSun}
                    </p>
                  </div>
                </div>
              )}

              {/* Natal chart highlights */}
              {reading.chartHighlights.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(77, 58, 92, 0.35)",
                    border: "1px solid rgba(208, 180, 247, 0.18)",
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-wider mb-3"
                    style={{ color: "#d0b4f7" }}
                  >
                    ✦ Natal chart highlights
                  </p>
                  <ul className="space-y-2.5">
                    {reading.chartHighlights.map((line, i) => {
                      const Icon = i === 0 ? Star : i === 1 ? Moon : Sunrise;
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          <Icon
                            className="w-4 h-4 shrink-0 mt-0.5"
                            style={{ color: "#d0b4f7" }}
                          />
                          <span
                            className="text-sm leading-relaxed"
                            style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif" }}
                          >
                            {line}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Human Design notes */}
              {reading.humanDesignNotes.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(109, 40, 217, 0.14)",
                    border: "1px solid rgba(208, 180, 247, 0.22)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-4" style={{ color: "#f9d697" }} />
                    <p
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "#f9d697" }}
                    >
                      Human Design notes
                      {reading.userHdType ? ` · ${reading.userHdType}` : ""}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {reading.humanDesignNotes.map((line, i) => (
                      <li
                        key={i}
                        className="text-sm leading-relaxed pl-3 border-l-2"
                        style={{
                          color: "#e0d4ff",
                          fontFamily: "Lora, Georgia, serif",
                          borderColor: "rgba(249, 214, 151, 0.4)",
                        }}
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  {!reading.userHdType && (
                    <button
                      onClick={() => navigate("/profile")}
                      className="mt-3 text-[11px] underline"
                      style={{ color: "#d0b4f7" }}
                    >
                      Add your birth time in Profile for personalized HD insight →
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 rounded-full py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(77, 58, 92, 0.4)",
                    border: "1px solid rgba(208, 180, 247, 0.2)",
                    color: "#c9b8f0",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  New reading
                </button>
                <button
                  onClick={async () => {
                    const text = `${reading.theirName} & I — ${reading.score}% cosmic alignment ✦\n\n${reading.highlight}\n\nRead on Stellara — stellara.app`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: "Cosmic Compatibility", text });
                      } catch {
                        /* user cancelled */
                      }
                    } else {
                      await navigator.clipboard.writeText(text);
                      toast.success("Copied to clipboard ✦");
                    }
                  }}
                  className="flex-1 rounded-full py-3 text-sm font-medium"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #8b5cf6, #6d28d9)",
                    color: "#ffffff",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Share ✦
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Saved drawer */}
      <AnimatePresence>
        {showSaved && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaved(false)}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(12, 11, 19, 0.7)" }}
            />
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", damping: 26, stiffness: 230 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] overflow-y-auto"
              style={{
                backgroundColor: "#0c0b13",
                borderLeft: "1px solid rgba(208, 180, 247, 0.15)",
              }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base" style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif" }}>
                    My Connections
                  </h3>
                  <button
                    onClick={() => setShowSaved(false)}
                    className="text-xs"
                    style={{ color: "#7a6a9a" }}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {saved.length === 0 ? (
                    <p className="text-xs text-center py-8" style={{ color: "#7a6a9a" }}>
                      No saved readings yet.
                    </p>
                  ) : (
                    saved.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                        style={{
                          backgroundColor: "rgba(77, 58, 92, 0.3)",
                          border: "1px solid rgba(208, 180, 247, 0.15)",
                        }}
                      >
                        <div>
                          <p className="text-sm" style={{ color: "#e0d4ff" }}>
                            {c.their_name || "Someone"}
                          </p>
                          <p className="text-[10px]" style={{ color: "#7a6a9a" }}>
                            {new Date(c.created_at).toLocaleDateString()} · {c.compatibility_score ?? "—"}%
                          </p>
                        </div>
                        <button
                          onClick={() => deleteCheck(c.id)}
                          className="p-1.5 text-[#7a6a9a] hover:text-rose-300"
                          aria-label="Delete reading"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckConnection;