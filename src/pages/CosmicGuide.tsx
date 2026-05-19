import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Plus, Trash2, MessageSquare, Loader2, X, Volume2, VolumeX, Sparkles, Info, Heart, ShieldAlert, Search, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SparkleLoader from "@/components/SparkleLoader";
import { toast } from "@/hooks/use-toast";
import { useTourHighlight } from "@/hooks/useTourHighlight";
import { useLyraVoice } from "@/hooks/useLyraVoice";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { markLyraIntroAck } from "@/hooks/useFoundationStatus";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = {
  id: string;
  title: string;
  last_message_at: string;
  is_active: boolean;
  ended_at: string | null;
  message_count: number;
};

const STARTER_PROMPTS = [
  "What does my chart say about love right now?",
  "I'm feeling stuck — what energy am I working with this week?",
  "How do I navigate this connection I just made?",
  "What's my Human Design strategy trying to teach me today?",
];

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

// Deterministic star field
const STAR_FIELD = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 37 + 13) % 100,
  size: ((i * 7) % 3) + 1,
  opacity: 0.25 + ((i * 11) % 60) / 100,
}));

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const CosmicGuide = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [historySearch, setHistorySearch] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const prevLastRoleRef = useRef<string | null>(null);
  const titledRef = useRef<Set<string>>(new Set());

  const activeConvo = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const isReviewMode = !!activeConvo && !activeConvo.is_active;

  // Finalize helper (title or end)
  const finalize = async (conversationId: string, action: "title" | "end") => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const tok = sess.session?.access_token;
      if (!tok) return null;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guide-session-finalize`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ action, conversation_id: conversationId }),
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.warn("[Lyra] finalize failed", action, e);
      return null;
    }
  };

  // Load conversations (one-time bootstrap)
  useEffect(() => {
    if (!user) return;
    markLyraIntroAck();
    (async () => {
      // Auto-end stale active sessions (>30 min idle)
      const cutoff = new Date(Date.now() - INACTIVITY_MS).toISOString();
      const { data: stale } = await supabase
        .from("guide_conversations")
        .select("id")
        .eq("is_active", true)
        .lt("last_message_at", cutoff);
      if (stale && stale.length > 0) {
        for (const s of stale) {
          await finalize(s.id, "end");
        }
      }

      const { data } = await supabase
        .from("guide_conversations")
        .select("id,title,last_message_at,is_active,ended_at,message_count")
        .order("last_message_at", { ascending: false });
      setConversations((data ?? []) as Conversation[]);

      // Seed deep-link: ALWAYS start a fresh session pre-filled with the prompt
      const seed = searchParams.get("seed");
      if (seed) {
        const next = new URLSearchParams(searchParams);
        next.delete("seed");
        setSearchParams(next, { replace: true });
        setInput(seed);
        // Start a new session immediately
        await startNewSession(seed);
      }
      setBootstrapped(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load messages when activeId changes
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

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const lastRole = last?.role ?? null;
    const countChanged = messages.length !== prevMsgCountRef.current;
    const roleChanged = lastRole !== prevLastRoleRef.current;
    const newAssistantArrived =
      !streaming && lastRole === "assistant" && (countChanged || roleChanged);
    const NEAR_BOTTOM_PX = 160;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    if (newAssistantArrived && lastAssistantRef.current) {
      if (isNearBottom) {
        const target = lastAssistantRef.current;
        const top = target.offsetTop - 12;
        el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    } else if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
    prevMsgCountRef.current = messages.length;
    prevLastRoleRef.current = lastRole;
  }, [messages, streaming]);

  // Voice playback on new assistant message
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

  // Start a brand-new session, deactivating any current active one first
  const startNewSession = async (seedTopic?: string): Promise<string | null> => {
    if (!user) return null;
    // End any currently-active session (server will summarize)
    const { data: active } = await supabase
      .from("guide_conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (active?.id) {
      // Deactivate locally first so the partial unique index doesn't trip
      await supabase
        .from("guide_conversations")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", active.id);
      // Fire-and-forget AI summary
      void finalize(active.id, "end");
    }

    const title = seedTopic
      ? seedTopic.slice(0, 60) + (seedTopic.length > 60 ? "…" : "")
      : "New conversation";
    const { data, error } = await supabase
      .from("guide_conversations")
      .insert({
        user_id: user.id,
        title,
        seed_topic: seedTopic ?? null,
        is_active: true,
      })
      .select("id,title,last_message_at,is_active,ended_at,message_count")
      .single();
    if (error || !data) {
      toast({ title: "Couldn't start session", description: error?.message, variant: "destructive" });
      return null;
    }
    setConversations((prev) => [
      data as Conversation,
      ...prev.map((c) => (c.is_active ? { ...c, is_active: false, ended_at: new Date().toISOString() } : c)),
    ]);
    setActiveId(data.id);
    setMessages([]);
    return data.id;
  };

  // End current session manually (button)
  const endCurrentSession = async () => {
    if (!activeConvo || !activeConvo.is_active) {
      setActiveId(null);
      setMessages([]);
      return;
    }
    await supabase
      .from("guide_conversations")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", activeConvo.id);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvo.id ? { ...c, is_active: false, ended_at: new Date().toISOString() } : c
      )
    );
    void finalize(activeConvo.id, "end");
    setActiveId(null);
    setMessages([]);
    toast({ title: "Session ended", description: "Lyra will remember the themes." });
  };

  // Resume an ended session
  const continueSession = async (id: string) => {
    if (!user) return;
    // End any other active session first
    const { data: active } = await supabase
      .from("guide_conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .neq("id", id)
      .maybeSingle();
    if (active?.id) {
      await supabase
        .from("guide_conversations")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", active.id);
      void finalize(active.id, "end");
    }
    const { error } = await supabase
      .from("guide_conversations")
      .update({ is_active: true, ended_at: null })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't continue", description: error.message, variant: "destructive" });
      return;
    }
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, is_active: true, ended_at: null };
        if (c.is_active) return { ...c, is_active: false, ended_at: new Date().toISOString() };
        return c;
      })
    );
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
    // If no active session OR current is review-mode, start a new one
    if (!convoId || !activeConvo?.is_active) {
      convoId = await startNewSession();
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

    // Auto-title after the first user message of a new session
    const isFirstUserMsg = messages.length === 0;
    if (isFirstUserMsg && convoId && !titledRef.current.has(convoId)) {
      titledRef.current.add(convoId);
      // Fire-and-forget; refresh local title when it returns
      (async () => {
        await new Promise((r) => setTimeout(r, 800)); // give insert a beat
        const res = await finalize(convoId!, "title");
        if (res?.title) {
          setConversations((prev) =>
            prev.map((c) => (c.id === convoId ? { ...c, title: res.title } : c))
          );
        }
      })();
    }

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ conversation_id: convoId, messages: nextHistory }),
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
          if (json === "[DONE]") { done = true; break; }
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

  const filteredConvos = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, historySearch]);

  const hasPriorSessions = conversations.length > 0;
  const isEmpty = messages.length === 0 && !streaming;
  const showWelcomeBack = isEmpty && !activeId && hasPriorSessions && bootstrapped;
  const showNewUserEmpty = isEmpty && !activeId && !hasPriorSessions && bootstrapped;
  const showSessionEmpty = isEmpty && !!activeId && activeConvo?.is_active;

  const historyDrawer = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0b4f7]/15">
        <h3 className="font-display text-base text-[#e0d4ff]">Recent chats</h3>
        <button
          onClick={() => setShowHistory(false)}
          className="p-1.5 rounded-full hover:bg-[#4d3a5c]/40 text-[#7a6a9a]"
          aria-label="Close history"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6a9a]" />
          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-2 rounded-full text-sm bg-[#4d3a5c]/30 border border-[#d0b4f7]/15 text-[#e0d4ff] placeholder:text-[#7a6a9a] outline-none focus:border-[#d0b4f7]/40"
            style={{ fontFamily: "Poppins, sans-serif" }}
          />
        </div>
      </div>
      <button
        onClick={async () => {
          setShowHistory(false);
          await startNewSession();
        }}
        className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-[#e0d4ff] border border-[#d0b4f7]/25 bg-[#4d3a5c]/30 hover:bg-[#4d3a5c]/50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Start new conversation
      </button>
      <div className="flex-1 overflow-y-auto px-2 mt-3">
        <div className="space-y-1 pb-4">
          {filteredConvos.map((c) => (
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
              <div className="flex-1 min-w-0">
                <div className="truncate">{c.title}</div>
                <div className="text-[10px] text-[#7a6a9a]/80 mt-0.5 flex items-center gap-1.5">
                  <span>{relativeTime(c.last_message_at)}</span>
                  {c.is_active && (
                    <span className="text-[#d0b4f7]">· active</span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${c.title}"?`)) deleteConversation(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[#7a6a9a] hover:text-destructive transition"
                aria-label="Delete conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {filteredConvos.length === 0 && (
            <p className="text-xs text-[#7a6a9a] px-2 py-4 text-center">
              {historySearch ? "No matches." : "No conversations yet. Lyra is waiting."}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0c0b13" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(109, 40, 217, 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 90%, rgba(77, 58, 92, 0.25), transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        {STAR_FIELD.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <button
          onClick={() => setShowHistory(true)}
          className="inline-flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-full hover:bg-[#4d3a5c]/40 text-[#a89cc9] hover:text-[#e0d4ff] transition-colors"
          aria-label="Open recent chats"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs tracking-wide" style={{ fontFamily: "Poppins, sans-serif" }}>
            Recent{conversations.length > 0 ? ` · ${conversations.length}` : ""}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {activeConvo?.is_active && messages.length > 0 && (
            <button
              onClick={endCurrentSession}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-[#a89cc9] hover:text-[#e0d4ff] hover:bg-[#4d3a5c]/40 transition-colors"
              style={{ fontFamily: "Poppins, sans-serif" }}
              aria-label="End session and start new chat"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
          )}
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
              style={{ color: voice.enabled ? "#d0b4f7" : "#7a6a9a" }}
            >
              {voice.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {/* Lyra avatar header */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-2 pb-5">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <span
            className="absolute inset-0 rounded-full border animate-pulse"
            style={{ borderColor: "rgba(208, 180, 247, 0.4)", animationDuration: "3.5s" }}
          />
          <span
            className="absolute inset-[-6px] rounded-full border animate-pulse"
            style={{ borderColor: "rgba(208, 180, 247, 0.18)", animationDuration: "5s" }}
          />
          {streaming && (
            <span
              className="absolute inset-[-12px] rounded-full blur-2xl animate-pulse"
              style={{ backgroundColor: "rgba(127, 119, 221, 0.45)", animationDuration: "2s" }}
            />
          )}
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 30%, #b89df5, #6d28d9 60%, #2a1740)",
              boxShadow: "0 0 30px rgba(127, 119, 221, 0.5), inset 0 0 12px rgba(255,255,255,0.15)",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden>
              <path d="M12 2.5l1.6 5.4 5.4 1.6-5.4 1.6L12 16.5l-1.6-5.4L5 9.5l5.4-1.6L12 2.5z" fill="#f9d697" />
              <circle cx="12" cy="9.5" r="1" fill="#0c0b13" />
            </svg>
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "12s" }}>
            <span
              className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: "#f9d697", boxShadow: "0 0 8px rgba(249, 214, 151, 0.9)" }}
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
        {activeConvo && activeConvo.is_active && messages.length > 0 && (
          <p
            className="mt-2 max-w-xs text-center text-[11px] tracking-wide truncate"
            style={{ color: "#a89cc9", fontFamily: "Lora, Georgia, serif" }}
            title={activeConvo.title}
          >
            ✦ {activeConvo.title}
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowDisclaimer(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15 transition-colors"
          aria-label="View AI and safety disclaimer"
        >
          <Info className="w-3 h-3 text-amber-400" />
          <span
            className="text-[10.5px] tracking-wide text-amber-300/90"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            AI guidance · for entertainment · tap to learn more
          </span>
        </button>
        {voice.speaking && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="flex items-end gap-[3px] h-3">
              <span className="w-[3px] rounded-full animate-pulse" style={{ backgroundColor: "#7F77DD", height: "60%", animationDuration: "0.7s" }} />
              <span className="w-[3px] rounded-full animate-pulse" style={{ backgroundColor: "#7F77DD", height: "100%", animationDuration: "0.5s", animationDelay: "0.1s" }} />
              <span className="w-[3px] rounded-full animate-pulse" style={{ backgroundColor: "#7F77DD", height: "70%", animationDuration: "0.6s", animationDelay: "0.2s" }} />
            </div>
            <span className="text-[11px]" style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}>
              Lyra is speaking…
            </span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8">
        <div className="max-w-2xl mx-auto space-y-3 pt-4 pb-6">
          {loadingThread ? (
            <div className="flex items-center justify-center py-10">
              <SparkleLoader size={28} label="Lyra is reading your chart..." />
            </div>
          ) : showWelcomeBack ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center py-4"
            >
              <p className="text-base leading-relaxed max-w-md mb-6" style={{ color: "#c9b8f0", fontFamily: "Lora, Georgia, serif" }}>
                ✨ Welcome back. Start a new conversation, or revisit a recent one.
              </p>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => startNewSession()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-[#e0d4ff]"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #8b5cf6, #6d28d9)",
                    boxShadow: "0 0 16px rgba(127, 119, 221, 0.4)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  New chat
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-[#c9b8f0] border border-[#d0b4f7]/25 hover:bg-[#4d3a5c]/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Recent chats
                </button>
              </div>
              <div className="w-full max-w-lg">
                <div className="text-[11px] uppercase tracking-[0.15em] mb-2 px-1 text-left" style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}>
                  Recent
                </div>
                <div className="space-y-1.5">
                  {conversations.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-2xl transition-colors"
                      style={{ backgroundColor: "rgba(77, 58, 92, 0.35)", border: "1px solid rgba(208, 180, 247, 0.18)" }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" style={{ color: "#d0b4f7" }} />
                      <span className="flex-1 truncate text-sm" style={{ color: "#c9b8f0", fontFamily: "Poppins, sans-serif" }}>
                        {c.title}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}>
                        {relativeTime(c.last_message_at)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (showNewUserEmpty || showSessionEmpty) ? (
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
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {isReviewMode && (
                <div
                  className="rounded-2xl px-4 py-3 mb-2 text-xs text-center"
                  style={{
                    backgroundColor: "rgba(208, 180, 247, 0.08)",
                    border: "1px solid rgba(208, 180, 247, 0.22)",
                    color: "#a89cc9",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  ✦ This session has ended {activeConvo?.ended_at ? `· ${relativeTime(activeConvo.ended_at)}` : ""}. You're reviewing it.
                </div>
              )}
              {messages.map((m, i) => {
                const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
                return (
                  <motion.div
                    key={i}
                    ref={isLastAssistant ? lastAssistantRef : undefined}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[88%] md:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={
                        m.role === "user"
                          ? { backgroundColor: "rgba(109, 40, 217, 0.25)", color: "#a89ac8", fontFamily: "Poppins, sans-serif" }
                          : { backgroundColor: "rgba(77, 58, 92, 0.5)", border: "1px solid rgba(208, 180, 247, 0.22)", color: "#c9b8f0", fontFamily: "Lora, Georgia, serif" }
                      }
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-p:my-2 prose-li:my-0.5" style={{ color: "#c9b8f0" }}>
                          <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                    style={{ backgroundColor: "rgba(77, 58, 92, 0.5)", border: "1px solid rgba(208, 180, 247, 0.22)" }}
                  >
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#7F77DD", animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#7F77DD", animationDelay: "200ms" }} />
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#7F77DD", animationDelay: "400ms" }} />
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

      {/* Composer or Continue button */}
      <div
        className="relative z-10 px-4 pt-3"
        style={{
          paddingBottom:
            "calc(var(--keyboard-inset, 0px) + max(env(safe-area-inset-bottom), 0.5rem) + 5.5rem)",
          transition: "padding-bottom 180ms ease-out",
        }}
      >
        <div className="max-w-2xl mx-auto">
          {isReviewMode ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => activeConvo && continueSession(activeConvo.id)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm text-[#e0d4ff]"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #8b5cf6, #6d28d9)",
                  boxShadow: "0 0 16px rgba(127, 119, 221, 0.4)",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Continue this conversation
              </button>
              <button
                onClick={() => startNewSession()}
                className="text-xs text-[#a89cc9] hover:text-[#e0d4ff] transition-colors"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                or start a new chat
              </button>
            </div>
          ) : (
            <>
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
                  style={{ color: "#e0d4ff", fontFamily: "Poppins, sans-serif" }}
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
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p
                className="text-[10px] mt-2 text-center"
                style={{ color: "#7a6a9a", fontFamily: "Poppins, sans-serif" }}
              >
                Lyra offers reflection, not prediction. For entertainment & insight only.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-20 z-0" style={{ backgroundColor: "#0a0910" }} />

      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(12, 11, 19, 0.7)", backdropFilter: "blur(4px)" }}
            />
            <motion.aside
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: "spring", damping: 26, stiffness: 230 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw]"
              style={{ backgroundColor: "#0c0b13", borderRight: "1px solid rgba(208, 180, 247, 0.15)" }}
            >
              {historyDrawer}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent className="max-w-md border-amber-400/30 bg-[#0c0b13]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              About Lyra & Astrology
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Please read before relying on Lyra's guidance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground/90 mt-2">
            <div className="flex gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">Lyra is an AI.</span> Responses are generated by a language model and may be inaccurate, incomplete, or made up. Always think for yourself.
              </p>
            </div>
            <div className="flex gap-3">
              <Heart className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">For entertainment & self-reflection only.</span> Astrology, Human Design, and numerology are not science. Stellara content is not a substitute for medical, legal, financial, or mental-health advice.
              </p>
            </div>
            <div className="flex gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">In a crisis?</span> If you're struggling, please reach out to a qualified professional. In the US, text <span className="text-amber-300">HOME</span> to <span className="text-amber-300">741741</span> or call <span className="text-amber-300">988</span>.
              </p>
            </div>
            <p className="text-xs text-muted-foreground/80 border-t border-border/40 pt-3">
              By chatting with Lyra you agree to our{" "}
              <button onClick={() => navigate("/terms")} className="text-amber-400 hover:underline">Terms</button>,{" "}
              <button onClick={() => navigate("/privacy")} className="text-amber-400 hover:underline">Privacy Policy</button>, and{" "}
              <button onClick={() => navigate("/disclaimer")} className="text-amber-400 hover:underline">full Disclaimer</button>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CosmicGuide;