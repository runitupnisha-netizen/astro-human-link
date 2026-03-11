import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Sparkles, BookOpen, Flame, Leaf, Star, User, Loader2, Trash2 } from "lucide-react";
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

const AlignmentFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("reflection");
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

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

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

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
      toast({ title: "✨ Shared with the community" });
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
              Share spiritual reflections, growth experiences, and intentions with the community
            </p>
          </motion.div>

          {/* Compose */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card mb-6">
              <CardContent className="p-5">
                <Textarea
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">No Posts Yet</h3>
              <p className="text-muted-foreground text-sm">Be the first to share a spiritual reflection!</p>
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
      </div>
    </div>
  );
};

export default AlignmentFeed;
