import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface SparkleLoaderProps {
  /** Pixel size of the sparkle mark. Default 32. Use 64+ for large hero loads (e.g. Soulmate Sketch). */
  size?: number;
  /** Optional text shown beneath the mark. */
  label?: string;
  /** When provided alongside `label`, cycles through these lines every `cycleMs`. */
  cycleLines?: string[];
  cycleMs?: number;
  className?: string;
}

import { useEffect, useState } from "react";

/**
 * Stellara-branded loading indicator.
 * Replaces generic spinners app-wide. Slow pulse on the sparkle star mark.
 */
const SparkleLoader = ({
  size = 32,
  label,
  cycleLines,
  cycleMs = 2500,
  className = "",
}: SparkleLoaderProps) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!cycleLines || cycleLines.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % cycleLines.length), cycleMs);
    return () => clearInterval(t);
  }, [cycleLines, cycleMs]);

  const text = cycleLines && cycleLines.length > 0 ? cycleLines[idx] : label;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="text-primary"
        style={{ width: size, height: size }}
        aria-label="Loading"
        role="status"
      >
        <Sparkles style={{ width: size, height: size }} />
      </motion.div>
      {text && (
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm font-serif text-muted-foreground text-center max-w-xs"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default SparkleLoader;