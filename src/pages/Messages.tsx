import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Sparkles, ArrowLeft, Wand2, ShieldAlert, User, Check, CheckCheck } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Match {
  id: string;
  user_a: string;
  user_b: string;
  compatibility_score: number | null;
  compatibility_summary: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  sun_sign: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
}

interface ConversationData {
  match: Match;
  otherProfile: Profile;
  lastMessage?: Message;
  unreadCount: number;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingIcebreaker, setSendingIcebreaker] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const loadConversations = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      if (!matches || matches.length === 0) {
        setLoading(false);
        return;
      }

      const otherUserIds = matches.map((m) =>
        m.user_a === user.id ? m.user_b : m.user_a
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, sun_sign, avatar_url")
        .in("user_id", otherUserIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const convos: ConversationData[] = await Promise.all(
        matches.map(async (match) => {
          const otherId = match.user_a === user.id ? match.user_b : match.user_a;
          const { data: lastMsgs } = await supabase
            .from("messages")
            .select("*")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            match,
            otherProfile: profileMap.get(otherId) || {
              user_id: otherId,
              display_name: "Cosmic Soul",
              sun_sign: null,
              avatar_url: null,
            },
            lastMessage: lastMsgs?.[0],
            unreadCount: 0,
          };
        })
      );

      convos.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.match.created_at;
        const bTime = b.lastMessage?.created_at || b.match.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(convos);
      setLoading(false);
    };

    loadConversations();
  }, [user]);

  // Load messages + realtime subscription
  useEffect(() => {
    if (!selectedMatchId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", selectedMatchId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages:${selectedMatchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${selectedMatchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Remove optimistic message and avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const withoutOptimistic = prev.filter(
              (m) => !(m.id.startsWith("temp-") && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
            );
            return [...withoutOptimistic, newMsg];
          });
          // Update conversation list last message
          setConversations((prev) =>
            prev.map((c) =>
              c.match.id === selectedMatchId
                ? { ...c, lastMessage: newMsg }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMatchId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!selectedMatchId || !user) return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at && !m.id.startsWith("temp-"))
      .map((m) => m.id);
    if (unreadIds.length === 0) return;

    const markRead = async () => {
      const now = new Date().toISOString();
      await supabase
        .from("messages")
        .update({ read_at: now })
        .in("id", unreadIds);
      setMessages((prev) =>
        prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: now } : m))
      );
    };
    markRead();
  }, [messages, selectedMatchId, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMatchId || !user || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      match_id: selectedMatchId,
      sender_id: user.id,
      content,
      message_type: "text",
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert({
      match_id: selectedMatchId,
      sender_id: user.id,
      content,
      message_type: "text",
    });

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setNewMessage(content);
    }
    setSending(false);
  };

  const handleGenerateIcebreakers = async () => {
    if (!selectedMatchId) return;
    setSendingIcebreaker(true);
    setIcebreakers([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-icebreaker", {
        body: { matchId: selectedMatchId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIcebreakers(data.icebreakers || []);
    } catch (e: any) {
      toast({
        title: "Couldn't generate icebreakers",
        description: e.message || "Try again in a moment",
        variant: "destructive",
      });
    } finally {
      setSendingIcebreaker(false);
    }
  };

  const sendIcebreaker = async (text: string) => {
    if (!selectedMatchId || !user) return;
    setIcebreakers([]);

    const optimisticMsg: Message = {
      id: `temp-ib-${Date.now()}`,
      match_id: selectedMatchId,
      sender_id: user.id,
      content: text,
      message_type: "icebreaker",
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    await supabase.from("messages").insert({
      match_id: selectedMatchId,
      sender_id: user.id,
      content: text,
      message_type: "icebreaker",
    });
  };

  const selectedConvo = conversations.find((c) => c.match.id === selectedMatchId);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 rounded-full blur-xl animate-pulse scale-150" />
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[calc(100vh-6rem)]">
          {conversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl animate-pulse scale-150" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                  <MessageCircle className="w-10 h-10 text-foreground" />
                </div>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">No Matches Yet</h2>
              <p className="text-muted-foreground max-w-md font-serif">
                When you and another soul both connect, you'll be able to message each other here. Keep exploring the cosmos!
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Conversations List */}
              <Card className={`bg-card/80 backdrop-blur-sm border-border/50 lg:col-span-1 overflow-hidden ${showMobileChat ? "hidden lg:block" : ""}`}>
                <CardContent className="p-0 h-full flex flex-col">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Soul Messages
                    </h2>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {conversations.map((convo, idx) => (
                      <motion.div
                        key={convo.match.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          setSelectedMatchId(convo.match.id);
                          setShowMobileChat(true);
                          setIcebreakers([]);
                        }}
                        className={`p-4 cursor-pointer transition-all duration-300 border-b border-border/30 hover:bg-primary/8 hover:pl-5 ${
                          selectedMatchId === convo.match.id
                            ? "bg-primary/10 border-l-2 border-l-primary"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-mystical flex items-center justify-center shrink-0 ring-2 ring-border/30 overflow-hidden">
                            {convo.otherProfile.avatar_url ? (
                              <img src={convo.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className="font-semibold text-foreground text-sm truncate">
                                {convo.otherProfile.display_name || "Cosmic Soul"}
                              </h3>
                              {convo.lastMessage && (
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                  {formatTime(convo.lastMessage.created_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {convo.otherProfile.sun_sign && (
                                <span className="text-[10px] text-accent">☉ {convo.otherProfile.sun_sign}</span>
                              )}
                              {convo.match.compatibility_score && (
                                <span className="text-[10px] text-primary font-medium">
                                  {convo.match.compatibility_score}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {convo.lastMessage
                                ? convo.lastMessage.message_type === "icebreaker"
                                  ? `✨ ${convo.lastMessage.content}`
                                  : convo.lastMessage.content
                                : "✨ Start your cosmic conversation!"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className={`bg-card/80 backdrop-blur-sm border-border/50 lg:col-span-2 overflow-hidden ${!showMobileChat ? "hidden lg:block" : ""}`}>
                <CardContent className="p-0 h-full flex flex-col">
                  {selectedConvo ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-border flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="lg:hidden p-1"
                          onClick={() => setShowMobileChat(false)}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-10 h-10 rounded-full bg-gradient-mystical flex items-center justify-center ring-2 ring-border/30 overflow-hidden">
                          {selectedConvo.otherProfile.avatar_url ? (
                            <img src={selectedConvo.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display font-bold text-foreground">
                            {selectedConvo.otherProfile.display_name || "Cosmic Soul"}
                          </h3>
                          <div className="flex items-center gap-2">
                            {selectedConvo.match.compatibility_score && (
                              <Badge variant="outline" className="text-[10px] border-accent/30 text-accent h-5">
                                {selectedConvo.match.compatibility_score}% Match
                              </Badge>
                            )}
                            {selectedConvo.otherProfile.sun_sign && (
                              <span className="text-[10px] text-muted-foreground">
                                ☉ {selectedConvo.otherProfile.sun_sign}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateIcebreakers}
                          disabled={sendingIcebreaker}
                          className="text-accent hover:text-accent hover:bg-accent/10"
                        >
                          <Wand2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && !sendingIcebreaker && icebreakers.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-16"
                          >
                            <div className="relative w-16 h-16 mx-auto mb-4">
                              <div className="absolute inset-0 bg-accent/10 rounded-full blur-xl animate-pulse scale-150" />
                              <div className="relative w-16 h-16 rounded-full bg-gradient-golden flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-accent-foreground" />
                              </div>
                            </div>
                            <h3 className="font-display text-lg font-bold text-foreground mb-2">
                              The Stars Have Aligned!
                            </h3>
                            <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto font-serif">
                              You and {selectedConvo.otherProfile.display_name || "your match"} share a cosmic connection. Break the ice!
                            </p>
                            <Button
                              onClick={handleGenerateIcebreakers}
                              className="gap-2"
                              style={{ background: "var(--gradient-aurora)" }}
                            >
                              <Wand2 className="w-4 h-4" />
                              Generate Cosmic Icebreakers
                            </Button>
                          </motion.div>
                        )}

                        {sendingIcebreaker && icebreakers.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                          >
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground font-serif">Channeling the cosmos...</p>
                          </motion.div>
                        )}

                        <AnimatePresence>
                          {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === user?.id;
                            const isIcebreaker = msg.message_type === "icebreaker";
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] px-4 py-2.5 ${
                                    isMe
                                      ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                                      : "rounded-2xl rounded-bl-md bg-muted/60 text-foreground"
                                  } ${isIcebreaker ? "border border-accent/30 bg-accent/10" : ""}`}
                                >
                                  {isIcebreaker && (
                                    <span className="text-[9px] uppercase tracking-widest text-accent font-semibold block mb-1">
                                      ✨ Cosmic Icebreaker
                                    </span>
                                  )}
                                  <p className="text-sm leading-relaxed">{msg.content}</p>
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[10px] opacity-50">
                                      {new Date(msg.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {isMe && (
                                      msg.read_at ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-accent" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5 opacity-50" />
                                      )
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Icebreaker suggestions */}
                      <AnimatePresence>
                        {icebreakers.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="px-4 pb-2 space-y-2"
                          >
                            <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">
                              ✨ Tap an icebreaker to send:
                            </span>
                            {icebreakers.map((ib, i) => (
                              <motion.button
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => sendIcebreaker(ib)}
                                className="w-full text-left text-sm p-3 rounded-xl bg-accent/5 border border-accent/20 hover:bg-accent/15 hover:border-accent/40 transition-all text-foreground leading-relaxed"
                              >
                                {ib}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Message Input */}
                      <div className="p-4 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Share your cosmic thoughts..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                            className="flex-1 bg-background/50 border-border"
                          />
                          <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                            className="bg-primary hover:bg-primary/90 shadow-glow shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center p-8">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-muted-foreground font-serif">Select a conversation to begin</p>
                      </motion.div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-2 text-center">
            <Link to="/disclaimer" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <ShieldAlert className="w-3 h-3" />
              Aligned is not responsible for meetups or shared information. Read our full disclaimer.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
