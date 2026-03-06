import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Sparkles, ArrowLeft, Wand2, ShieldAlert } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const [sendingIcebreaker, setSendingIcebreaker] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Load conversations (matches with profiles)
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

      // Get last message for each match
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

      // Sort by last message time
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

  // Load messages for selected match
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

    // Subscribe to realtime
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
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMatchId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMatchId || !user) return;

    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      match_id: selectedMatchId,
      sender_id: user.id,
      content,
      message_type: "text",
    });

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      setNewMessage(content);
    }
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
      setIcebreakers(data.icebreakers || []);
    } catch {
      toast({ title: "Couldn't generate icebreakers", description: "Try again in a moment", variant: "destructive" });
    } finally {
      setSendingIcebreaker(false);
    }
  };

  const sendIcebreaker = async (text: string) => {
    if (!selectedMatchId || !user) return;
    await supabase.from("messages").insert({
      match_id: selectedMatchId,
      sender_id: user.id,
      content: text,
      message_type: "icebreaker",
    });
    setIcebreakers([]);
  };

  const selectedConvo = conversations.find((c) => c.match.id === selectedMatchId);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[calc(100vh-6rem)]">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No Matches Yet</h2>
              <p className="text-muted-foreground max-w-md">
                When you and another soul both connect, you'll be able to message each other here. Keep exploring the cosmos!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Conversations List */}
              <Card className={`bg-card/80 backdrop-blur-sm border-border/50 lg:col-span-1 ${showMobileChat ? "hidden lg:block" : ""}`}>
                <CardContent className="p-0 h-full flex flex-col">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      Soul Messages
                    </h2>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {conversations.map((convo) => (
                      <div
                        key={convo.match.id}
                        onClick={() => {
                          setSelectedMatchId(convo.match.id);
                          setShowMobileChat(true);
                          setIcebreakers([]);
                        }}
                        className={`p-4 cursor-pointer transition-colors border-b border-border/50 hover:bg-secondary/20 ${
                          selectedMatchId === convo.match.id ? "bg-secondary/30" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-mystical flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6 text-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-foreground truncate">
                                {convo.otherProfile.display_name || "Cosmic Soul"}
                              </h3>
                              {convo.lastMessage && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatTime(convo.lastMessage.created_at)}
                                </span>
                              )}
                            </div>
                            {convo.match.compatibility_score && (
                              <Badge variant="outline" className="text-xs border-accent/30 text-accent mb-1">
                                {convo.match.compatibility_score}% Match
                              </Badge>
                            )}
                            {convo.otherProfile.sun_sign && (
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary ml-1 mb-1">
                                {convo.otherProfile.sun_sign}
                              </Badge>
                            )}
                            <p className="text-sm text-muted-foreground truncate">
                              {convo.lastMessage
                                ? convo.lastMessage.content
                                : "✨ Start your cosmic conversation!"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className={`bg-card/80 backdrop-blur-sm border-border/50 lg:col-span-2 ${!showMobileChat ? "hidden lg:block" : ""}`}>
                <CardContent className="p-0 h-full flex flex-col">
                  {selectedConvo ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-border flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="lg:hidden"
                          onClick={() => setShowMobileChat(false)}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-10 h-10 rounded-full bg-gradient-mystical flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {selectedConvo.otherProfile.display_name || "Cosmic Soul"}
                          </h3>
                          <div className="flex items-center gap-2">
                            {selectedConvo.match.compatibility_score && (
                              <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                                {selectedConvo.match.compatibility_score}% Cosmic Match
                              </Badge>
                            )}
                            {selectedConvo.otherProfile.sun_sign && (
                              <span className="text-xs text-muted-foreground">
                                ☉ {selectedConvo.otherProfile.sun_sign}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                          <div className="text-center py-12">
                            <Sparkles className="w-12 h-12 text-primary mx-auto mb-3 opacity-60" />
                            <p className="text-muted-foreground mb-4">
                              The stars have aligned! Send your first message.
                            </p>
                            <Button
                              variant="outline"
                              onClick={handleGenerateIcebreakers}
                              disabled={sendingIcebreaker}
                              className="border-primary/30"
                            >
                              <Wand2 className="w-4 h-4 mr-2" />
                              {sendingIcebreaker ? "Channeling the cosmos..." : "Generate Cosmic Icebreakers"}
                            </Button>
                          </div>
                        )}

                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                msg.sender_id === user?.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary/50 text-foreground"
                              } ${msg.message_type === "icebreaker" ? "border border-accent/30" : ""}`}
                            >
                              {msg.message_type === "icebreaker" && (
                                <span className="text-[10px] uppercase tracking-wider opacity-70 block mb-1">
                                  ✨ Cosmic Icebreaker
                                </span>
                              )}
                              <p className="text-sm">{msg.content}</p>
                              <span className="text-[10px] opacity-60 mt-1 block">
                                {new Date(msg.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Icebreaker suggestions */}
                      {icebreakers.length > 0 && (
                        <div className="px-4 pb-2 flex flex-col gap-2">
                          <span className="text-xs text-muted-foreground">✨ Tap to send:</span>
                          {icebreakers.map((ib, i) => (
                            <button
                              key={i}
                              onClick={() => sendIcebreaker(ib)}
                              className="text-left text-sm p-3 rounded-xl bg-secondary/30 border border-primary/20 hover:bg-secondary/50 transition-colors text-foreground"
                            >
                              {ib}
                            </button>
                          ))}
                        </div>
                      )}

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
                            disabled={!newMessage.trim()}
                            className="bg-primary hover:bg-primary/90 shadow-glow"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        {messages.length > 0 && (
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleGenerateIcebreakers}
                              disabled={sendingIcebreaker}
                              className="text-xs text-muted-foreground"
                            >
                              <Wand2 className="w-3 h-3 mr-1" />
                              {sendingIcebreaker ? "Generating..." : "Cosmic Icebreaker"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center p-8">
                      <div>
                        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-muted-foreground">Select a conversation to begin</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
