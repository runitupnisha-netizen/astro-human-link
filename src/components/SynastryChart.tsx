import { motion } from "framer-motion";

interface SynastryChartProps {
  mySigns: { sun: string | null; moon: string | null; rising: string | null };
  theirSigns: { sun: string | null; moon: string | null; rising: string | null };
  score: number;
}

const ZODIAC_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const getSignIndex = (sign: string | null) => sign ? ZODIAC_ORDER.indexOf(sign) : -1;

const SynastryChart = ({ mySigns, theirSigns, score }: SynastryChartProps) => {
  const cx = 160;
  const cy = 160;
  const outerR = 140;
  const innerR = 100;
  const planetR = 75;

  const getPointOnCircle = (index: number, radius: number) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const myPlanets = [
    { label: "☉", sign: mySigns.sun, color: "hsl(var(--accent))" },
    { label: "☽", sign: mySigns.moon, color: "hsl(var(--primary))" },
    { label: "↗", sign: mySigns.rising, color: "hsl(var(--secondary-foreground))" },
  ];

  const theirPlanets = [
    { label: "☉", sign: theirSigns.sun, color: "hsl(42, 90%, 70%)" },
    { label: "☽", sign: theirSigns.moon, color: "hsl(270, 60%, 70%)" },
    { label: "↗", sign: theirSigns.rising, color: "hsl(180, 50%, 60%)" },
  ];

  return (
    <div className="relative flex justify-center">
      <svg width="320" height="320" viewBox="0 0 320 320" className="drop-shadow-lg">
        {/* Outer zodiac wheel */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity={0.4} />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity={0.3} />

        {/* Zodiac sign divisions and labels */}
        {ZODIAC_ORDER.map((sign, i) => {
          const start = getPointOnCircle(i, innerR);
          const end = getPointOnCircle(i, outerR);
          const labelPos = getPointOnCircle(i, (outerR + innerR) / 2 + 2);
          const midAngle = ((i * 30 + 15) - 90) * (Math.PI / 180);
          const textPos = { x: cx + ((outerR + innerR) / 2) * Math.cos(midAngle), y: cy + ((outerR + innerR) / 2) * Math.sin(midAngle) };

          return (
            <g key={sign}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity={0.3} />
              <text x={textPos.x} y={textPos.y} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="hsl(var(--muted-foreground))" opacity={0.7}>
                {ZODIAC_SYMBOLS[sign]}
              </text>
            </g>
          );
        })}

        {/* Aspect lines between my and their planets */}
        {myPlanets.map((mp, mi) => {
          const mpIdx = getSignIndex(mp.sign);
          if (mpIdx === -1) return null;
          return theirPlanets.map((tp, ti) => {
            const tpIdx = getSignIndex(tp.sign);
            if (tpIdx === -1) return null;
            const myPos = getPointOnCircle(mpIdx, planetR - 10);
            const theirPos = getPointOnCircle(tpIdx, planetR + 10);
            const diff = Math.abs(mpIdx - tpIdx);
            const aspect = diff <= 1 || diff >= 11 ? "conjunction" : diff === 4 || diff === 8 ? "trine" : diff === 6 ? "opposition" : "other";
            const lineColor = aspect === "conjunction" ? "hsl(var(--accent))" : aspect === "trine" ? "hsl(120, 50%, 50%)" : aspect === "opposition" ? "hsl(0, 60%, 55%)" : "hsl(var(--muted-foreground))";
            const opacity = aspect === "other" ? 0.15 : 0.4;

            return (
              <motion.line
                key={`${mi}-${ti}`}
                x1={myPos.x} y1={myPos.y}
                x2={theirPos.x} y2={theirPos.y}
                stroke={lineColor}
                strokeWidth={aspect === "other" ? 0.5 : 1.5}
                strokeDasharray={aspect === "opposition" ? "4,4" : undefined}
                opacity={0}
                animate={{ opacity }}
                transition={{ delay: 1 + mi * 0.2 + ti * 0.1, duration: 0.5 }}
              />
            );
          });
        })}

        {/* My planet positions (inner) */}
        {myPlanets.map((p, i) => {
          const idx = getSignIndex(p.sign);
          if (idx === -1) return null;
          const pos = getPointOnCircle(idx, planetR - 10);
          return (
            <motion.g key={`my-${i}`} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.15 }}>
              <circle cx={pos.x} cy={pos.y} r="12" fill={p.color} opacity={0.2} />
              <circle cx={pos.x} cy={pos.y} r="8" fill={p.color} opacity={0.6} />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="white" fontWeight="bold">
                {p.label}
              </text>
            </motion.g>
          );
        })}

        {/* Their planet positions (outer ring offset) */}
        {theirPlanets.map((p, i) => {
          const idx = getSignIndex(p.sign);
          if (idx === -1) return null;
          const pos = getPointOnCircle(idx, planetR + 10);
          return (
            <motion.g key={`their-${i}`} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.15 }}>
              <circle cx={pos.x} cy={pos.y} r="12" fill={p.color} opacity={0.2} />
              <circle cx={pos.x} cy={pos.y} r="8" fill={p.color} opacity={0.6} stroke="white" strokeWidth="0.5" />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="white" fontWeight="bold">
                {p.label}
              </text>
            </motion.g>
          );
        })}

        {/* Center score */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <circle cx={cx} cy={cy} r="28" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--foreground))">{score}%</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" letterSpacing="1.5">SYNASTRY</text>
        </motion.g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> You</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Them</span>
      </div>
    </div>
  );
};

export default SynastryChart;
