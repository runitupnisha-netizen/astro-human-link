import { motion } from "framer-motion";
import { Sparkles, Heart, MessageCircle, Users, Star, Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EmptyStateProps {
  type: "matches" | "messages" | "connections" | "notifications" | "discover" | "search";
  action?: () => void;
}

const emptyStates = {
  matches: {
    icon: Heart,
    title: "No Matches Yet",
    description: "When you and someone both like each other, your cosmic connection begins here.",
    cta: "Start Discovering",
    route: "/discover",
    gradient: "from-pink-500/20 via-primary/10 to-accent/20",
  },
  messages: {
    icon: MessageCircle,
    title: "Your Inbox Awaits",
    description: "Start a conversation with your matches. The stars have aligned — say hello!",
    cta: "View Connections",
    route: "/connections",
    gradient: "from-primary/20 via-secondary/10 to-accent/20",
  },
  connections: {
    icon: Users,
    title: "No Soul Connections",
    description: "Keep swiping — your cosmic match is out there waiting to connect.",
    cta: "Discover Souls",
    route: "/discover",
    gradient: "from-accent/20 via-primary/10 to-secondary/20",
  },
  notifications: {
    icon: Star,
    title: "All Caught Up",
    description: "No new notifications. Check back soon — the universe has surprises in store!",
    cta: "Go Discover",
    route: "/discover",
    gradient: "from-accent/20 via-primary/10 to-pink-500/20",
  },
  discover: {
    icon: Compass,
    title: "Cosmic Alignment Loading",
    description: "We're preparing profiles aligned with your birth chart and design.",
    cta: "Refresh",
    route: "/discover",
    gradient: "from-primary/20 via-accent/10 to-secondary/20",
  },
  search: {
    icon: Search,
    title: "No Results Found",
    description: "Try adjusting your filters or search terms.",
    cta: "Clear Filters",
    route: "/discover",
    gradient: "from-muted/20 via-primary/10 to-accent/20",
  },
};

const EmptyState = ({ type, action }: EmptyStateProps) => {
  const navigate = useNavigate();
  const config = emptyStates[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full text-center px-8 py-16"
    >
      {/* Glowing icon */}
      <div className="relative mb-6">
        <div className={`absolute inset-0 bg-gradient-radial ${config.gradient} rounded-full blur-3xl scale-[2] animate-pulse`} />
        <motion.div
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical ring-2 ring-primary/20"
        >
          <Icon className="w-10 h-10 text-foreground" />
        </motion.div>
      </div>

      {/* Text */}
      <h3 className="font-display text-2xl font-bold text-foreground mb-2">{config.title}</h3>
      <p className="text-muted-foreground max-w-xs font-serif text-sm leading-relaxed mb-6">
        {config.description}
      </p>

      {/* Decorative stars */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          >
            <Sparkles className="w-3 h-3 text-accent" />
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <Button
        onClick={action || (() => navigate(config.route))}
        className="gap-2"
        style={{ background: "var(--gradient-aurora)" }}
      >
        <Sparkles className="w-4 h-4" />
        {config.cta}
      </Button>
    </motion.div>
  );
};

export default EmptyState;
