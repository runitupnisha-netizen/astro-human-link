import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import LyraStrip from "@/components/lyra/LyraStrip";
import BackButton from "@/components/BackButton";
import { getDailyPrompt, getDailyPromptIndex } from "@/data/shadowPrompts";

interface JournalEntry {
  id: string;
  prompt: string;
  entry: string;
  created_at: string;
  updated_at: string;
}

const ShadowJournal = () => {
  const { user } = useAuth();
  const todaysPrompt = useMemo(() => getDailyPrompt(), []);
  const promptIndex = useMemo(() => getDailyPromptIndex(), []);
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [profile, setProfile] = useState<{ moon_sign: string | null; sun_sign: string | null } | null>(null);
  /** ID of the most recently saved entry — drives the inline "Lyra reflection" surface. */
  const [lastSavedEntryId, setLastSavedEntryId] = useState<string | null>(null);
  const [lastSavedEntryText, setLastSavedEntryText] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [entriesRes, profileRes] = await Promise.all([
        supabase
          .from("shadow_journal_entries")
          .select("id, prompt, entry, created_at, updated_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("moon_sign, sun_sign")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setEntries((entriesRes.data ?? []) as JournalEntry[]);
      setProfile((profileRes.data as any) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = async () => {
    if (!user || !entry.trim()) return;
    setSaving(true);
    const text = entry.trim();
    const { data, error } = await supabase
      .from("shadow_journal_entries")
      .insert({
        user_id: user.id,
        prompt: todaysPrompt,
        prompt_index: promptIndex,
        entry: text,
      })
      .select("id, prompt, entry, created_at, updated_at")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((prev) => [data as JournalEntry, ...prev]);
    setEntry("");
    setLastSavedEntryId((data as JournalEntry).id);
    setLastSavedEntryText(text);
    toast({ title: "Saved ✦", description: "Your reflection is held safely." });
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase
      .from("shadow_journal_entries")
      .update({ entry: editText.trim() })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, entry: editText.trim() } : e)));
    setEditingId(null);
    setEditText("");
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: "#0c0b13" }}>
      {/* radial wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(109, 40, 217, 0.15), transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <BackButton fallback="/growth" />

        <div className="mt-3">
          <h1 className="text-[22px] leading-tight" style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff" }}>
            Shadow Work Journal
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif", fontWeight: 300 }}>
            Meet yourself. Love yourself.
          </p>
          {profile && (profile.moon_sign || profile.sun_sign) && (
            <div className="mt-3">
              <LyraStrip
                context="shadow_work"
                contextKey={`${profile.moon_sign}-${profile.sun_sign}`}
                payload={{
                  moon: profile.moon_sign,
                  sun: profile.sun_sign,
                  topic: "what shadow work means for this Venus or Moon placement",
                }}
              />
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 px-5 pt-6 pb-32 max-w-2xl mx-auto">
        {/* Today's prompt card */}
        <section
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "rgba(77, 58, 92, 0.35)",
            border: "1px solid rgba(208, 180, 247, 0.2)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-4">
            <Sparkles className="w-3 h-3" style={{ color: "#7a6a9a" }} />
            <span
              className="uppercase"
              style={{
                color: "#7a6a9a",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 500,
                fontSize: "11px",
                letterSpacing: "0.08em",
              }}
            >
              Today's prompt
            </span>
          </div>
          <p
            className="text-center italic leading-relaxed"
            style={{
              fontFamily: "Lora, Georgia, serif",
              color: "#e0d4ff",
              fontSize: "18px",
              lineHeight: 1.55,
            }}
          >
            "{todaysPrompt}"
          </p>
        </section>

        {/* Entry field */}
        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Write freely. This is only for you."
          className="w-full mt-5 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[#7F77DD] transition-shadow"
          style={{
            backgroundColor: "rgba(77, 58, 92, 0.2)",
            border: "1px solid rgba(208, 180, 247, 0.2)",
            color: "#c9b8f0",
            fontFamily: "Lora, Georgia, serif",
            fontSize: "15px",
            lineHeight: 1.7,
            minHeight: "200px",
            resize: "vertical",
          }}
        />

        {/* Save / sit with it */}
        <button
          onClick={save}
          disabled={saving || !entry.trim()}
          className="w-full mt-4 rounded-full py-3 text-white font-medium transition-opacity disabled:opacity-40 min-h-[44px]"
          style={{
            background: "#6d28d9",
            fontFamily: "Poppins, sans-serif",
            fontSize: "15px",
            boxShadow: "0 0 20px rgba(109, 40, 217, 0.35)",
          }}
        >
          {saving ? "Saving…" : "Save this reflection ✦"}
        </button>

        {/* Lyra reflection on the most recent save — meaningful "what happened" */}
        {lastSavedEntryId && (
          <motion.div
            key={lastSavedEntryId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(109, 40, 217, 0.12)",
              border: "1px solid rgba(208, 180, 247, 0.25)",
            }}
          >
            <p
              className="text-[11px] uppercase mb-2"
              style={{ color: "#9b84c8", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em" }}
            >
              Saved ✦ Lyra is reflecting…
            </p>
            <LyraStrip
              context="shadow_reflection"
              contextKey={lastSavedEntryId}
              payload={{
                prompt: todaysPrompt,
                entry: lastSavedEntryText,
                moon: profile?.moon_sign,
                sun: profile?.sun_sign,
              }}
              size="md"
              fallback="One breath. Your words are held."
            />
          </motion.div>
        )}

        <button
          onClick={() => setEntry("")}
          className="w-full mt-2 py-2 text-center text-sm transition-colors min-h-[44px]"
          style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}
        >
          I'll sit with it today
        </button>

        {/* Past entries */}
        <section className="mt-10">
          <h2
            className="text-[12px] mb-3"
            style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "0.06em" }}
          >
            YOUR REFLECTIONS
          </h2>

          {loading ? (
            <p className="text-xs" style={{ color: "#7a6a9a" }}>Reading your story…</p>
          ) : entries.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                backgroundColor: "rgba(77, 58, 92, 0.2)",
                border: "1px solid rgba(208, 180, 247, 0.15)",
              }}
            >
              <p
                className="italic mb-2"
                style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif", fontSize: "16px" }}
              >
                Your story starts here.
              </p>
              <p
                className="text-[13px] leading-relaxed mb-5"
                style={{ color: "#9b84c8", fontFamily: "Poppins, sans-serif", fontWeight: 300 }}
              >
                The shadow work journal is a safe space to meet the parts of yourself you have been
                avoiding — and love them into the light.
              </p>
              <button
                onClick={() => {
                  document.querySelector("textarea")?.focus();
                }}
                className="rounded-full px-5 py-2.5 text-white text-sm font-medium min-h-[44px]"
                style={{ background: "#6d28d9", fontFamily: "Poppins, sans-serif" }}
              >
                Write my first reflection ✦
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => {
                const isExpanded = expandedId === e.id;
                const isEditing = editingId === e.id;
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 cursor-pointer"
                    style={{
                      backgroundColor: "rgba(77, 58, 92, 0.25)",
                      border: "1px solid rgba(208, 180, 247, 0.15)",
                    }}
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : e.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        style={{
                          color: "#7a6a9a",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: 300,
                          fontSize: "11px",
                        }}
                      >
                        {formatDate(e.created_at)}
                      </span>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEditingId(e.id);
                          setEditText(e.entry);
                          setExpandedId(e.id);
                        }}
                        className="p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ color: "#9b84c8" }}
                        aria-label="Edit entry"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {isExpanded && (
                      <p
                        className="italic mb-2"
                        style={{
                          color: "#9b84c8",
                          fontFamily: "Lora, Georgia, serif",
                          fontSize: "13px",
                        }}
                      >
                        "{e.prompt}"
                      </p>
                    )}
                    {isEditing ? (
                      <>
                        <textarea
                          value={editText}
                          onChange={(ev) => setEditText(ev.target.value)}
                          onClick={(ev) => ev.stopPropagation()}
                          className="w-full rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#7F77DD]"
                          style={{
                            backgroundColor: "rgba(12, 11, 19, 0.5)",
                            border: "1px solid rgba(208, 180, 247, 0.2)",
                            color: "#c9b8f0",
                            fontFamily: "Lora, Georgia, serif",
                            fontSize: "14px",
                            minHeight: "140px",
                          }}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              saveEdit(e.id);
                            }}
                            className="rounded-full px-4 py-2 text-white text-xs font-medium min-h-[44px]"
                            style={{ background: "#6d28d9", fontFamily: "Poppins, sans-serif" }}
                          >
                            Save changes
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setEditingId(null);
                              setEditText("");
                            }}
                            className="rounded-full px-4 py-2 text-xs min-h-[44px]"
                            style={{
                              color: "#9b84c8",
                              backgroundColor: "transparent",
                              border: "1px solid rgba(208,180,247,0.2)",
                              fontFamily: "Poppins, sans-serif",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <p
                        className={isExpanded ? "" : "line-clamp-1"}
                        style={{
                          color: "#c9b8f0",
                          fontFamily: "Lora, Georgia, serif",
                          fontSize: "14px",
                          lineHeight: 1.7,
                          whiteSpace: isExpanded ? "pre-wrap" : "normal",
                        }}
                      >
                        {e.entry}
                      </p>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default ShadowJournal;