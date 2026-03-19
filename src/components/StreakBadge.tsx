import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";

const StreakBadge = () => {
  const { current_streak, longest_streak } = useStreak();

  if (current_streak <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2"
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-bold text-orange-400">{current_streak} day streak</span>
      </div>
      {current_streak >= longest_streak && current_streak > 1 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 border border-accent/30"
        >
          <Trophy className="w-3 h-3 text-accent" />
          <span className="text-[10px] font-medium text-accent">Best!</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StreakBadge;
