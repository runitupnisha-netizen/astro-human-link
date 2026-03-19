import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const REACTION_EMOJIS = ["❤️", "😂", "🔥", "😍", "👏", "🙏"];

interface MessageReactionsProps {
  messageId: string;
  matchId: string;
  isMe: boolean;
}

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}

const MessageReactions = ({ messageId, matchId, isMe }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("message_reactions")
        .select("id, emoji, user_id")
        .eq("message_id", messageId);
      setReactions(data || []);
    };
    load();

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.emoji === emoji && r.user_id === user.id);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      }).select("id, emoji, user_id").single();
      if (data) setReactions(prev => [...prev, data]);
    }
    setShowPicker(false);
  };

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji].count++;
    if (r.user_id === user?.id) acc[r.emoji].mine = true;
    return acc;
  }, {});

  return (
    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
      {/* Existing reactions */}
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <motion.button
          key={emoji}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
            mine ? "bg-primary/15 border-primary/30" : "bg-muted/30 border-border/30"
          }`}
          onClick={() => toggleReaction(emoji)}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
        </motion.button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-all opacity-0 group-hover:opacity-100"
        >
          +
        </button>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute ${isMe ? "right-0" : "left-0"} bottom-full mb-1 flex gap-1 bg-card border border-border/50 rounded-full px-2 py-1 shadow-elevated z-20`}
            >
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="text-base hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessageReactions;
