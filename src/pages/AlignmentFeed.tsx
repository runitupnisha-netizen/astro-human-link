import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Sparkles, BookOpen, Flame, Leaf, Star, User, Loader2, Trash2, Feather } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "reflection", label: "Reflection", icon: BookOpen, color: "bg-primary/15 text-primary border-primary/30" },
  { value: "growth", label: "Growth", icon: Leaf, color: "bg-green-400/15 text-green-400 border-green-400/30" },
  { value: "gratitude", label: "Gratitude", icon: Heart, color: "bg-accent/15 text-accent border-accent/30" },
  { value: "insight", label: "Insight", icon: Sparkles, color: "bg-cyan-300/15 text-cyan-300 border-cyan-300/30" },
  { value: "intention", label: "Intention", icon: Flame, color: "bg-orange-400/15 text-orange-400 border-orange-400/30" },
];

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  category: string;
  likes_count: number;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    sun_sign: string | null;
  };
  liked_by_me?: boolean;
}

const SparkleParticle = ({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, background: color }}
    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
    animate={{ opacity: 0, x, y, scale: 0 }}
    transition={{ duration: 0.8 + Math.random() * 0.4, delay, ease: "easeOut" }}
  />
);

const AlignmentFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("reflection");
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [showSparkles, setShowSparkles] = useState(false);
  const [hasPostedBefore, setHasPostedBefore] = useState(true);
  const sparkleAnchorRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    const { data: postsData } = await supabase
      .from("alignment_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData) { setLoading(false); return; }

    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, sun_sign")
      .in("user_id", userIds);

    const { data: myLikes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const likedSet = new Set((myLikes || []).map(l => l.post_id));

    setPosts(postsData.map(p => ({
      ...p,
      profile: profileMap.get(p.user_id) || undefined,
      liked_by_me: likedSet.has(p.id),
    })));
    setLoading(false);
  }, [user]);

  // Check if user has posted before
  useEffect(() => {
    if (!user) return;
    supabase
      .from("alignment_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        setHasPostedBefore((count ?? 0) > 0);
      });
  }, [user]);



  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alignment_posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!newContent.trim() || !user) return;
    const isFirstPost = !hasPostedBefore;
    setPosting(true);
    const { error } = await supabase.from("alignment_posts").insert({
      user_id: user.id,
      content: newContent.trim(),
      category: newCategory,
    });
    if (error) {
      toast({ title: "Couldn't post", description: error.message, variant: "destructive" });
    } else {
      setNewContent("");
      if (isFirstPost) {
        setShowSparkles(true);
        setHasPostedBefore(true);
        toast({ title: "🎉 Your first spark! Welcome to the community" });
        setTimeout(() => setShowSparkles(false), 1500);
      } else {
        toast({ title: "✨ Shared with the community" });
      }
    }
    setPosting(false);
  };

  const handleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts();
  };

  const handleDelete = async (postId: string) => {
    await supabase.from("alignment_posts").delete().eq("id", postId);
    fetchPosts();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "Yesterday" : `${days}d`;
  };

  const filteredPosts = filter ? posts.filter(p => p.category === filter) : posts;

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mb-2">
              Alignment Feed
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto font-serif">
              Share what you're{" "}
              <button onClick={() => setFilter("growth")} className="text-primary hover:underline underline-offset-2 transition-colors">learning</button>,{" "}
              <button onClick={() => setFilter("reflection")} className="text-primary hover:underline underline-offset-2 transition-colors">evolving through</button>, and the{" "}
              <button onClick={() => setFilter("intention")} className="text-accent hover:underline underline-offset-2 transition-colors">intentions</button>{" "}
              you're calling into your life.
            </p>
          </motion.div>

          {/* Compose */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card mb-6">
              <CardContent className="p-5">
                <Textarea
                  ref={textareaRef}
                  placeholder="What's on your mind?"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="bg-background/30 border-border/30 min-h-[80px] resize-none mb-3 font-serif"
                  maxLength={500}
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setNewCategory(cat.value)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          newCategory === cat.value ? cat.color : "border-border/30 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <cat.icon className="w-3 h-3" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={handlePost}
                    disabled={!newContent.trim() || posting}
                    size="sm"
                    className="btn-shimmer"
                    style={{ background: "var(--gradient-aurora)" }}
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="ml-1.5">Share</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filter chips */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                !filter ? "bg-primary/15 text-primary border-primary/30" : "border-border/30 text-muted-foreground"
              }`}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setFilter(filter === cat.value ? null : cat.value)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  filter === cat.value ? cat.color : "border-border/30 text-muted-foreground"
                }`}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Posts */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center py-16 relative">
              {/* Floating orbs background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-primary/10 blur-xl"
                    style={{
                      width: 40 + i * 20,
                      height: 40 + i * 20,
                      left: `${15 + i * 16}%`,
                      top: `${20 + (i % 3) * 25}%`,
                    }}
                    animate={{
                      y: [0, -12, 0],
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 3 + i * 0.5,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              {/* Animated icon cluster */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-md"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative w-full h-full rounded-full bg-muted/20 backdrop-blur-sm border border-border/30 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="w-10 h-10 text-primary" />
                  </motion.div>
                </div>
                {/* Orbiting icons */}
                {[BookOpen, Heart, Flame].map((Icon, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-8 h-8 rounded-full bg-card/80 border border-border/40 flex items-center justify-center shadow-cosmic"
                    style={{ top: "50%", left: "50%" }}
                    animate={{
                      x: [Math.cos((i * 2 * Math.PI) / 3) * 48, Math.cos((i * 2 * Math.PI) / 3 + Math.PI) * 48],
                      y: [Math.sin((i * 2 * Math.PI) / 3) * 48, Math.sin((i * 2 * Math.PI) / 3 + Math.PI) * 48],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.div>
                ))}
              </div>

              <h3 className="font-display text-xl font-bold text-foreground mb-2">The Space Awaits</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                This is a sacred space for reflections, growth, and intentions. Your words plant seeds here.
              </p>
              <button
                onClick={() => {
                  textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all text-sm font-medium hover:scale-105"
              >
                <Feather className="w-4 h-4" />
                Be the first to share something
              </button>
            </motion.div>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {filteredPosts.map((post, i) => {
                  const cat = CATEGORIES.find(c => c.value === post.category);
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="bg-card/70 backdrop-blur-sm border-border/40 glow-border">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-mystical flex items-center justify-center ring-1 ring-primary/20 shrink-0 overflow-hidden">
                              {post.profile?.avatar_url ? (
                                <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-foreground/70" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground text-sm">{post.profile?.display_name || "Someone"}</span>
                                {post.profile?.sun_sign && (
                                  <span className="text-xs text-muted-foreground">☉ {post.profile.sun_sign}</span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">{formatTime(post.created_at)}</span>
                              </div>
                              {cat && (
                                <Badge variant="outline" className={`text-[10px] mb-2 ${cat.color}`}>
                                  <cat.icon className="w-2.5 h-2.5 mr-1" />
                                  {cat.label}
                                </Badge>
                              )}
                              <p className="text-sm text-foreground/90 font-serif leading-relaxed whitespace-pre-wrap">{post.content}</p>
                              <div className="flex items-center gap-3 mt-3">
                                <button
                                  onClick={() => handleLike(post.id, !!post.liked_by_me)}
                                  className={`inline-flex items-center gap-1 text-xs transition-colors ${
                                    post.liked_by_me ? "text-accent" : "text-muted-foreground hover:text-accent"
                                  }`}
                                >
                                  <Heart className={`w-4 h-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                                  {post.likes_count > 0 && post.likes_count}
                                </button>
                                {post.user_id === user?.id && (
                                  <button
                                    onClick={() => handleDelete(post.id)}
                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Mobile FAB */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            textareaRef.current?.focus();
            textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="fixed bottom-24 right-5 z-50 md:hidden w-14 h-14 rounded-full bg-gradient-golden shadow-golden flex items-center justify-center text-background active:shadow-cosmic transition-shadow"
          aria-label="Compose new post"
        >
          <Feather className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};

export default AlignmentFeed;
