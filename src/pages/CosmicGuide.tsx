import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Send, Plus, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";

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

const CosmicGuide = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
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

    // Persist user message (fire-and-forget)
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

      // Persist assistant reply
      if (assistantSoFar) {
        await supabase.from("guide_messages").insert({
          conversation_id: convoId,
          user_id: user.id,
          role: "assistant",
          content: assistantSoFar,
        });
        // Refresh conversation order
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

  const sidebarContent = useMemo(
    () => (
      <div className="flex flex-col h-full">
        <Button
          onClick={() => {
            setActiveId(null);
            setMessages([]);
            setShowSidebar(false);
          }}
          variant="outline"
          className="m-3 gap-2 border-primary/30 hover:bg-primary/10"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </Button>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer transition-colors ${
                  activeId === c.id
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setShowSidebar(false);
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                No conversations yet. Lyra is waiting.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, activeId]
  );

  return (
    <div className="min-h-screen bg-background relative pt-16 pb-24 md:pb-6">
      <CosmicBackground />
      <div className="relative max-w-6xl mx-auto px-3 md:px-6 h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] flex gap-4">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/40">
          {sidebarContent}
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSidebar(false)}
                className="md:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="md:hidden fixed left-0 top-16 bottom-20 z-50 w-72 bg-card/95 backdrop-blur-xl border-r border-border/40"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Chat panel */}
        <main className="flex-1 flex flex-col rounded-2xl bg-card/30 backdrop-blur-xl border border-border/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-muted/40"
              aria-label="Open conversations"
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse" />
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-background" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-base text-gradient-aurora truncate">Lyra</h1>
              <p className="text-[11px] text-muted-foreground">Your cosmic guide</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4">
            {loadingThread ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : isEmpty ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-8 md:py-16"
              >
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-primary/40 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg">
                    <Sparkles className="w-7 h-7 text-background" />
                  </div>
                </div>
                <h2 className="font-display text-2xl text-gradient-aurora mb-2">Hi, I'm Lyra ✨</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                  I read your stars, your design, your numbers — and I listen.
                  Ask me anything about love, alignment, or what your soul is whispering today.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-left px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/40 hover:border-primary/40 text-sm text-foreground transition-all"
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
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/50 text-foreground rounded-bl-md border border-border/40"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/40 p-3 md:p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask Lyra anything…"
                rows={1}
                className="min-h-[44px] max-h-32 resize-none bg-background/60 border-border/50 focus-visible:ring-primary/40"
                disabled={streaming}
              />
              <Button
                onClick={() => send()}
                disabled={streaming || !input.trim()}
                size="icon"
                className="h-11 w-11 shrink-0 bg-gradient-to-br from-primary to-accent hover:opacity-90"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Lyra offers reflection, not prediction. For entertainment & insight only.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CosmicGuide;