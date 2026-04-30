import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Plus, Trash2, MessageSquare, Loader2, X, Volume2, VolumeX, Sparkles, Info, Heart, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SparkleLoader from "@/components/SparkleLoader";
import { toast } from "@/hooks/use-toast";
import { useTourHighlight } from "@/hooks/useTourHighlight";
import { useLyraVoice } from "@/hooks/useLyraVoice";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = {
  id: string;
  title: string;
  last_message_at: string;
};

const STARTER_PROMPTS = [
  "What does my chart say about love right now?",
  "I'm feeling stuck — what energy am I working with this week?",
  "How do I navigate this connection I just made?",
  "What's my Human Design strategy trying to teach me today?",
];

// Deterministic star field positions (so they don't reshuffle on re-render)
const STAR_FIELD = Array.from({ length: 18 }, (_, i) => {
  // Pseudo-random but stable
  const x = ((i * 53) % 100);
  const y = ((i * 37 + 13) % 100);
  const size = ((i * 7) % 3) + 1; // 1-3px
  const opacity = 0.25 + ((i * 11) % 60) / 100; // 0.25-0.85
  return { x, y, size, opacity };
});

const CosmicGuide = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputHighlight = useTourHighlight("lyra-input");
  const voice = useLyraVoice();
  const [showVoicePrimer, setShowVoicePrimer] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const lastSpokenRef = useRef<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("guide_conversations")
        .select("id,title,last_message_at")
        .order("last_message_at", { ascending: false });
      setConversations(data ?? []);
      if (data && data.length > 0 && !activeId) {
        setActiveId(data[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    setLoadingThread(true);
    (async () => {
      const { data } = await supabase
        .from("guide_messages")
        .select("role,content")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      setMessages(
        (data ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
      setLoadingThread(false);
    })();
  }, [activeId]);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // When streaming finishes, speak the latest assistant message (if voice on)
  // and trigger the first-time primer hint after Lyra's first reply ever.
  useEffect(() => {
    if (streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    if (lastSpokenRef.current === last.content) return;
    lastSpokenRef.current = last.content;

    if (voice.enabled) {
      voice.speak(last.content);
    } else if (voice.firstTimePrimerPending) {
      setShowVoicePrimer(true);
      voice.dismissPrimer();
      window.setTimeout(() => setShowVoicePrimer(false), 5000);
    }
  }, [streaming, messages, voice]);

  const createConversation = async (firstMessage?: string): Promise<string | null> => {
    if (!user) return null;
    const title = firstMessage
      ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "")
      : "New conversation";
    const { data, error } = await supabase
      .from("guide_conversations")
      .insert({ user_id: user.id, title })
      .select("id,title,last_message_at")
      .single();
    if (error || !data) {
      toast({ title: "Couldn't start conversation", description: error?.message, variant: "destructive" });
      return null;
    }
    setConversations((prev) => [data, ...prev]);
    setActiveId(data.id);
    setMessages([]);
    return data.id;
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from("guide_conversations").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const send = async (textOverride?: string) => {
    if (!user || streaming) return;
    const text = (textOverride ?? input).trim();
    if (!text) return;

    let convoId = activeId;
    if (!convoId) {
      convoId = await createConversation(text);
      if (!convoId) return;
    }

    const userMsg: Msg = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setStreaming(true);

    void supabase.from("guide_messages").insert({
      conversation_id: convoId,
      user_id: user.id,
      role: "user",
      content: text,
    });

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cosmic-guide`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: nextHistory }),
      });

      if (resp.status === 429) {
        toast({ title: "Lyra needs a breath", description: "Too many messages right now. Try again in a moment." });
        setStreaming(false);
        setMessages(nextHistory);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "AI credits exhausted", description: "Add credits in workspace settings.", variant: "destructive" });
        setStreaming(false);
        setMessages(nextHistory);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantSoFar) {
        await supabase.from("guide_messages").insert({
          conversation_id: convoId,
          user_id: user.id,
          role: "assistant",
          content: assistantSoFar,
        });
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === convoId);
          if (idx === -1) return prev;
          const updated = { ...prev[idx], last_message_at: new Date().toISOString() };
          return [updated, ...prev.filter((c) => c.id !== convoId)];
        });
      }
    } catch (e) {
      console.error("[Lyra] stream error", e);
      toast({
        title: "Lyra got disconnected",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setStreaming(false);
    }
  };

  const isEmpty = messages.length === 0 && !streaming;

  const historyDrawer = useMemo(
    () => (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0b4f7]/15">
          <h3 className="font-display text-base text-[#e0d4ff]">Conversations</h3>
          <button
            onClick={() => setShowHistory(false)}
            className="p-1.5 rounded-full hover:bg-[#4d3a5c]/40 text-[#7a6a9a]"
            aria-label="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => {
            setActiveId(null);
            setMessages([]);
            setShowHistory(false);
          }}
          className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-[#e0d4ff] border border-[#d0b4f7]/25 bg-[#4d3a5c]/30 hover:bg-[#4d3a5c]/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </button>
        <div className="flex-1 overflow-y-auto px-2 mt-3">
          <div className="space-y-1 pb-4">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                  activeId === c.id
                    ? "bg-[#4d3a5c]/50 text-[#e0d4ff]"
                    : "text-[#7a6a9a] hover:bg-[#4d3a5c]/25 hover:text-[#c9b8f0]"
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setShowHistory(false);
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#7a6a9a] hover:text-destructive transition"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-[#7a6a9a] px-2 py-4 text-center">
                No conversations yet. Lyra is waiting.
              </p>
            )}
          </div>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, activeId]
  );

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0c0b13" }}
    >
      {/* Subtle radial wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(109, 40, 217, 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 90%, rgba(77, 58, 92, 0.25), transparent 70%)",
        }}
      />

      {/* Static star particles */}
      <div className="pointer-events-none absolute inset-0">
        {STAR_FIELD.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      {/* Top bar with history trigger */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <button
          onClick={() => setShowHistory(true)}
          className="p-2 rounded-full hover:bg-[#4d3a5c]/40 text-[#7a6a9a] hover:text-[#c9b8f0] transition-colors"
          aria-label="Open conversation history"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        {voice.supported ? (
          <button
            onClick={() => {
              if (voice.speaking) {
                voice.stop();
              } else {
                const next = !voice.enabled;
                voice.setEnabled(next);
                if (!next) voice.stop();
                voice.dismissPrimer();
                setShowVoicePrimer(false);
              }
            }}
            className="p-2 rounded-full hover:bg-[#4d3a5c]/40 transition-colors"
            aria-label={voice.enabled ? "Mute Lyra" : "Hear Lyra speak"}
            title={voice.enabled ? "Lyra voice is on — tap to mute" : "Hear Lyra speak"}
            style={{ color: voice.enabled ? "#d0b4f7" : "#7a6a9a" }}
          >
            {voice.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Lyra avatar header */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-2 pb-5">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Outer pulsing ring */}
          <span
            className="absolute inset-0 rounded-full border animate-pulse"
            style={{ borderColor: "rgba(208, 180, 247, 0.4)", animationDuration: "3.5s" }}
          />
          <span
            className="absolute inset-[-6px] rounded-full border animate-pulse"
            style={{ borderColor: "rgba(208, 180, 247, 0.18)", animationDuration: "5s" }}
          />
          {/* Breathing glow when active */}
          {streaming && (
            <span
              className="absolute inset-[-12px] rounded-full blur-2xl animate-pulse"
              style={{ backgroundColor: "rgba(127, 119, 221, 0.45)", animationDuration: "2s" }}
            />
          )}
          {/* Sparkle mark (Stellara-style) */}
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 30%, #b89df5, #6d28d9 60%, #2a1740)",
              boxShadow: "0 0 30px rgba(127, 119, 221, 0.5), inset 0 0 12px rgba(255,255,255,0.15)",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden>
              <path
                d="M12 2.5l1.6 5.4 5.4 1.6-5.4 1.6L12 16.5l-1.6-5.4L5 9.5l5.4-1.6L12 2.5z"
                fill="#f9d697"
              />
              <circle cx="12" cy="9.5" r="1" fill="#0c0b13" />
            </svg>
          </div>
          {/* Orbiting gold dot */}
          <div
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: "12s" }}
          >
            <span
              className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full"
              style={{
                backgroundColor: "#f9d697",
                boxShadow: "0 0 8px rgba(249, 214, 151, 0.9)",
              }}
            />
          </div>
        </div>
        <h1
          className="mt-4 text-2xl tracking-wide"
          style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff" }}
        >
          Lyra
        </h1>
        <p
          className="mt-1 text-xs tracking-wider"
          style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif", fontWeight: 300 }}
        >
          your cosmic guide · always here
        </p>
        {voice.speaking && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="flex items-end gap-[3px] h-3">
              <span
                className="w-[3px] rounded-full animate-pulse"
                style={{ backgroundColor: "#7F77DD", height: "60%", animationDuration: "0.7s" }}
              />
              <span
                className="w-[3px] rounded-full animate-pulse"
                style={{ backgroundColor: "#7F77DD", height: "100%", animationDuration: "0.5s", animationDelay: "0.1s" }}
              />
              <span
                className="w-[3px] rounded-full animate-pulse"
                style={{ backgroundColor: "#7F77DD", height: "70%", animationDuration: "0.6s", animationDelay: "0.2s" }}
              />
            </div>
            <span
              className="text-[11px]"
              style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}
            >
              Lyra is speaking…
            </span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8"
      >
        <div className="max-w-2xl mx-auto space-y-3 pb-6">
          {loadingThread ? (
            <div className="flex items-center justify-center py-10">
              <SparkleLoader size={28} label="Lyra is reading your chart..." />
            </div>
          ) : isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center py-4"
            >
              <p
                className="text-base leading-relaxed max-w-md mb-8"
                style={{ color: "#c9b8f0", fontFamily: "Lora, Georgia, serif" }}
              >
                I read your stars, your design, your numbers — and I listen.
                Ask me anything about love, alignment, or what your soul is whispering today.
              </p>
              <div className="w-full grid grid-cols-1 gap-2 max-w-lg">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="text-left px-4 py-3 rounded-2xl text-sm transition-colors"
                    style={{
                      backgroundColor: "rgba(77, 58, 92, 0.35)",
                      border: "1px solid rgba(208, 180, 247, 0.18)",
                      color: "#c9b8f0",
                      fontFamily: "Poppins, sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(77, 58, 92, 0.55)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(77, 58, 92, 0.35)";
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[88%] md:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      m.role === "user"
                        ? {
                            backgroundColor: "rgba(109, 40, 217, 0.25)",
                            color: "#a89ac8",
                            fontFamily: "Poppins, sans-serif",
                          }
                        : {
                            backgroundColor: "rgba(77, 58, 92, 0.5)",
                            border: "1px solid rgba(208, 180, 247, 0.22)",
                            color: "#c9b8f0",
                            fontFamily: "Lora, Georgia, serif",
                          }
                    }
                  >
                    {m.role === "assistant" ? (
                      <div
                        className="prose prose-sm max-w-none prose-p:my-2 prose-li:my-0.5"
                        style={{ color: "#c9b8f0" }}
                      >
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                    style={{
                      backgroundColor: "rgba(77, 58, 92, 0.5)",
                      border: "1px solid rgba(208, 180, 247, 0.22)",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#7F77DD", animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#7F77DD", animationDelay: "200ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#7F77DD", animationDelay: "400ms" }}
                    />
                  </div>
                </div>
              )}
              {showVoicePrimer && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <p
                    className="text-[11px] px-4 py-2 rounded-full"
                    style={{
                      color: "#d0b4f7",
                      backgroundColor: "rgba(77, 58, 92, 0.35)",
                      border: "1px solid rgba(208, 180, 247, 0.18)",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    ✦ Want to hear Lyra? Tap the speaker icon to listen.
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Composer (pill input) */}
      <div
        className="relative z-10 px-4 pt-3"
        style={{
          paddingBottom:
            "calc(var(--keyboard-inset, 0px) + max(env(safe-area-inset-bottom), 0.5rem) + 5.5rem)",
          transition: "padding-bottom 180ms ease-out",
        }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Check a Connection CTA */}
          <div className="flex justify-center mb-3">
            <button
              onClick={() => navigate("/check-connection")}
              className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full transition-colors"
              style={{
                backgroundColor: "rgba(208, 180, 247, 0.1)",
                border: "0.5px solid rgba(208, 180, 247, 0.3)",
                color: "#d0b4f7",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Check a Connection ✦
            </button>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-2 py-2 transition-shadow duration-500 ${
              inputHighlight ? "ring-2 ring-accent/70 animate-pulse" : ""
            }`}
            style={{
              backgroundColor: "rgba(77, 58, 92, 0.3)",
              border: "1px solid rgba(208, 180, 247, 0.2)",
              backdropFilter: "blur(12px)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask Lyra anything..."
              disabled={streaming}
              className="flex-1 bg-transparent outline-none px-4 py-2 text-sm placeholder:text-[#7a6a9a] disabled:opacity-60"
              style={{
                color: "#e0d4ff",
                fontFamily: "Poppins, sans-serif",
              }}
            />
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{
                background: "radial-gradient(circle at 35% 30%, #8b5cf6, #6d28d9)",
                boxShadow: "0 0 16px rgba(127, 119, 221, 0.4)",
                color: "#ffffff",
              }}
            >
              {streaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p
            className="text-[10px] mt-2 text-center"
            style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}
          >
            Lyra offers reflection, not prediction. For entertainment & insight only.
          </p>
        </div>
      </div>

      {/* Bottom nav darken layer (sits under the fixed Navigation) */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 h-20 z-0"
        style={{ backgroundColor: "#0a0910" }}
      />

      {/* History drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(12, 11, 19, 0.7)", backdropFilter: "blur(4px)" }}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 26, stiffness: 230 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw]"
              style={{
                backgroundColor: "#0c0b13",
                borderRight: "1px solid rgba(208, 180, 247, 0.15)",
              }}
            >
              {historyDrawer}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CosmicGuide;
