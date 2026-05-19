import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import BackButton from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MoonPhaseSVG from "@/components/MoonPhaseSVG";
import LyraStrip from "@/components/lyra/LyraStrip";
import { getMoonPhase, PHASE_ORDER, PHASE_NAMES, PHASE_DESCRIPTIONS } from "@/lib/moonPhase";

interface MoonEntry {
  id: string;
  phase: string;
  entry_type: string;
  content: string;
  created_at: string;
}

const MoonCycle = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phaseInfo = useMemo(() => getMoonPhase(), []);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<MoonEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ sun_sign: string | null; moon_sign: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [entriesRes, profileRes] = await Promise.all([
        supabase
          .from("moon_journal_entries")
          .select("id, phase, entry_type, content, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("sun_sign, moon_sign").eq("user_id", user.id).maybeSingle(),
      ]);
      setEntries((entriesRes.data ?? []) as MoonEntry[]);
      setProfile((profileRes.data as any) ?? null);
    })();
  }, [user]);

  const isNewMoon = phaseInfo.key === "new_moon";
  const isFullMoon = phaseInfo.key === "full_moon";
  const isActionPhase = isNewMoon || isFullMoon;

  const save = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    const entryType = isNewMoon ? "intention" : isFullMoon ? "release" : "reflection";
    const { data, error } = await supabase
      .from("moon_journal_entries")
      .insert({
        user_id: user.id,
        phase: phaseInfo.key,
        entry_type: entryType,
        content: content.trim(),
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((prev) => [data as MoonEntry, ...prev]);
    setContent("");
    toast({
      title: isNewMoon ? "Intention set ✦" : "Released under the moon ✦",
      description: "The cosmos has heard you.",
    });
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "#0c0b13" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 10%, rgba(127, 119, 221, 0.18), transparent 60%)",
        }}
      />

      <header className="relative z-10 px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <BackButton fallback="/growth" />
      </header>

      <main className="relative z-10 px-5 pb-32 max-w-2xl mx-auto">
        {/* Current phase hero */}
        <section className="flex flex-col items-center pt-4 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <MoonPhaseSVG phase={phaseInfo.key} size={140} />
          </motion.div>
          <h1
            className="mt-6"
            style={{
              fontFamily: "Lora, Georgia, serif",
              color: "#e0d4ff",
              fontSize: "22px",
            }}
          >
            {phaseInfo.name}
          </h1>
          <p
            className="mt-1 text-xs"
            style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}
          >
            {Math.round(phaseInfo.illumination * 100)}% illuminated
          </p>
          <div className="mt-3 max-w-md text-center">
            <LyraStrip
              context="moon_cycle"
              contextKey={phaseInfo.key}
              payload={{
                phase: phaseInfo.name,
                user_sun: profile?.sun_sign,
                user_moon: profile?.moon_sign,
              }}
              fallback={phaseInfo.shortDescription}
            />
          </div>
        </section>

        {/* Phase strip */}
        <section className="flex justify-between items-center px-2 mb-8 relative">
          {PHASE_ORDER.map((p) => {
            const active = p === phaseInfo.key;
            return (
              <button
                key={p}
                onClick={() => setHoveredPhase(hoveredPhase === p ? null : p)}
                className="relative flex items-center justify-center min-h-[44px] min-w-[44px]"
                aria-label={PHASE_NAMES[p]}
              >
                <div style={{ opacity: active ? 1 : 0.5 }}>
                  <MoonPhaseSVG phase={p} size={28} glow={active} />
                </div>
                {hoveredPhase === p && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full mt-2 z-20 whitespace-nowrap rounded-lg px-3 py-2 text-[11px]"
                    style={{
                      backgroundColor: "#1a0d2e",
                      border: "1px solid rgba(208, 180, 247, 0.25)",
                      color: "#e0d4ff",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    <strong className="block text-[12px]">{PHASE_NAMES[p]}</strong>
                    <span style={{ color: "#9b84c8" }}>{PHASE_DESCRIPTIONS[p]}</span>
                  </motion.div>
                )}
              </button>
            );
          })}
        </section>

        {/* Action card */}
        <section
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "rgba(77, 58, 92, 0.35)",
            border: "1px solid rgba(208, 180, 247, 0.2)",
          }}
        >
          {isNewMoon ? (
            <>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff", fontSize: "18px" }}>
                Set Your New Moon Intention
              </h2>
              <p
                className="mt-2"
                style={{
                  color: "#9b84c8",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                }}
              >
                What do you want to call into your love life in this lunar cycle?
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="I am calling in..."
                className="w-full mt-4 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#7F77DD]"
                style={{
                  backgroundColor: "rgba(12,11,19,0.5)",
                  border: "1px solid rgba(208,180,247,0.2)",
                  color: "#c9b8f0",
                  fontFamily: "Lora, Georgia, serif",
                  fontSize: "14px",
                  minHeight: "100px",
                }}
              />
              <button
                onClick={save}
                disabled={saving || !content.trim()}
                className="w-full mt-3 rounded-full py-3 text-white font-medium disabled:opacity-40 min-h-[44px]"
                style={{ background: "#6d28d9", fontFamily: "Poppins, sans-serif", fontSize: "14px" }}
              >
                Set My Intention ✦
              </button>
            </>
          ) : isFullMoon ? (
            <>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff", fontSize: "18px" }}>
                What Are You Ready to Release?
              </h2>
              <p
                className="mt-2"
                style={{
                  color: "#9b84c8",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                }}
              >
                Name one pattern, belief, or story about love you are releasing under this moon.
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="I am releasing..."
                className="w-full mt-4 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#7F77DD]"
                style={{
                  backgroundColor: "rgba(12,11,19,0.5)",
                  border: "1px solid rgba(208,180,247,0.2)",
                  color: "#c9b8f0",
                  fontFamily: "Lora, Georgia, serif",
                  fontSize: "14px",
                  minHeight: "100px",
                }}
              />
              <button
                onClick={save}
                disabled={saving || !content.trim()}
                className="w-full mt-3 rounded-full py-3 text-white font-medium disabled:opacity-40 min-h-[44px]"
                style={{ background: "#6d28d9", fontFamily: "Poppins, sans-serif", fontSize: "14px" }}
              >
                I release this under the full moon ✦
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff", fontSize: "18px" }}>
                {phaseInfo.name} Reflection
              </h2>
              <p
                className="mt-3"
                style={{
                  color: "#c9b8f0",
                  fontFamily: "Lora, Georgia, serif",
                  fontSize: "15px",
                  lineHeight: 1.7,
                }}
              >
                {phaseInfo.shortDescription} The {phaseInfo.name.toLowerCase()} is inviting you to
                notice the rhythm of your love life right now — what's growing, what's resting,
                what's asking to be tended.
              </p>
            </>
          )}
        </section>

        {/* Past moons link */}
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="block mx-auto mt-8 text-sm py-2 min-h-[44px]"
          style={{ color: "#9b84c8", fontFamily: "Poppins, sans-serif" }}
        >
          {showHistory ? "Hide past moons" : "View past moons →"}
        </button>

        {showHistory && (
          <section className="mt-4 space-y-3">
            {entries.length === 0 ? (
              <p
                className="text-center text-sm py-6"
                style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}
              >
                No moon entries yet. Your first intention or release will appear here.
              </p>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "rgba(77,58,92,0.2)",
                    border: "1px solid rgba(208,180,247,0.15)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[11px] uppercase"
                      style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif", letterSpacing: "0.06em" }}
                    >
                      {e.entry_type} · {PHASE_NAMES[e.phase as keyof typeof PHASE_NAMES] ?? e.phase}
                    </span>
                    <span style={{ color: "#7a6a9a", fontSize: "11px", fontFamily: "Poppins, sans-serif" }}>
                      {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p style={{ color: "#c9b8f0", fontFamily: "Lora, Georgia, serif", fontSize: "14px", lineHeight: 1.6 }}>
                    {e.content}
                  </p>
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default MoonCycle;