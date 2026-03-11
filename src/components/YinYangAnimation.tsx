import { motion } from "framer-motion";

const YinYangAnimation = () => {
  return (
    <div className="relative w-24 h-24 mx-auto mb-4">
      {/* Glow behind */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Left half — slides in from left */}
      <motion.div
        initial={{ x: -40, opacity: 0, rotate: -90 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <clipPath id="left-half">
              <rect x="0" y="0" width="50" height="100" />
            </clipPath>
          </defs>
          <g clipPath="url(#left-half)">
            {/* Dark half */}
            <circle cx="50" cy="50" r="48" fill="hsl(var(--foreground))" opacity="0.9" />
            {/* Inner curve */}
            <path d="M50 2 A24 24 0 0 1 50 50 A24 24 0 0 0 50 98" fill="hsl(var(--foreground))" opacity="0.9" />
            {/* Light dot */}
            <circle cx="50" cy="26" r="6" fill="hsl(var(--accent))" />
          </g>
        </svg>
      </motion.div>

      {/* Right half — slides in from right */}
      <motion.div
        initial={{ x: 40, opacity: 0, rotate: 90 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <clipPath id="right-half">
              <rect x="50" y="0" width="50" height="100" />
            </clipPath>
          </defs>
          <g clipPath="url(#right-half)">
            {/* Light half */}
            <circle cx="50" cy="50" r="48" fill="hsl(var(--accent))" opacity="0.85" />
            {/* Inner curve */}
            <path d="M50 2 A24 24 0 0 1 50 50 A24 24 0 0 0 50 98" fill="hsl(var(--accent))" opacity="0.85" />
            {/* Dark dot */}
            <circle cx="50" cy="74" r="6" fill="hsl(var(--foreground))" opacity="0.9" />
          </g>
        </svg>
      </motion.div>

      {/* Merge flash */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.8, 0], opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute inset-0 rounded-full bg-accent/30 blur-md"
      />

      {/* Slow spin once merged */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, rotate: 360 }}
        transition={{ opacity: { delay: 1, duration: 0.3 }, rotate: { delay: 1.2, duration: 20, repeat: Infinity, ease: "linear" } }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Full yin-yang */}
          <circle cx="50" cy="50" r="48" fill="hsl(var(--foreground))" opacity="0.9" />
          <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 0 50 50 A24 24 0 0 1 50 2" fill="hsl(var(--accent))" opacity="0.85" />
          <circle cx="50" cy="26" r="6" fill="hsl(var(--foreground))" opacity="0.9" />
          <circle cx="50" cy="74" r="6" fill="hsl(var(--accent))" opacity="0.85" />
          {/* Border */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="hsl(var(--accent))" strokeWidth="1" opacity="0.3" />
        </svg>
      </motion.div>
    </div>
  );
};

export default YinYangAnimation;
