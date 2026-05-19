/**
 * Decorative natal-wheel SVG with 12 zodiac slices and the user's Big Three
 * placed at their sign positions. This is a visual hero, not an ephemeris —
 * planetary degrees are computed elsewhere by Lyra/the cosmic engine.
 */
const SIGNS = [
  { name: "Aries", glyph: "♈" },
  { name: "Taurus", glyph: "♉" },
  { name: "Gemini", glyph: "♊" },
  { name: "Cancer", glyph: "♋" },
  { name: "Leo", glyph: "♌" },
  { name: "Virgo", glyph: "♍" },
  { name: "Libra", glyph: "♎" },
  { name: "Scorpio", glyph: "♏" },
  { name: "Sagittarius", glyph: "♐" },
  { name: "Capricorn", glyph: "♑" },
  { name: "Aquarius", glyph: "♒" },
  { name: "Pisces", glyph: "♓" },
];

const signIndex = (sign?: string | null) => {
  if (!sign) return -1;
  return SIGNS.findIndex((s) => s.name.toLowerCase() === sign.toLowerCase());
};

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const NatalWheel = ({ sun, moon, rising }: { sun?: string | null; moon?: string | null; rising?: string | null }) => {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 130;
  const rInner = 90;
  const rGlyph = 110;
  const rPlanet = 75;

  const placements = [
    { label: "☉", sign: sun, color: "hsl(45 90% 65%)" },
    { label: "☽", sign: moon, color: "hsl(220 60% 80%)" },
    { label: "↗", sign: rising, color: "hsl(280 60% 78%)" },
  ];

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
        <defs>
          <radialGradient id="wheelBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(260 40% 18%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(260 40% 8%)" stopOpacity="0.95" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#wheelBg)" stroke="hsl(280 50% 50% / 0.3)" />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="hsl(280 40% 60% / 0.2)" />
        {/* 12 slice lines */}
        {Array.from({ length: 12 }).map((_, i) => {
          const p1 = polar(cx, cy, rInner, i * 30);
          const p2 = polar(cx, cy, rOuter, i * 30);
          return (
            <line key={`l-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="hsl(280 40% 60% / 0.25)" />
          );
        })}
        {/* Sign glyphs */}
        {SIGNS.map((s, i) => {
          const pos = polar(cx, cy, rGlyph, i * 30 + 15);
          return (
            <text
              key={s.name}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fill="hsl(280 60% 80% / 0.9)"
            >
              {s.glyph}
            </text>
          );
        })}
        {/* Placements */}
        {placements.map((p, idx) => {
          const i = signIndex(p.sign);
          if (i < 0) return null;
          // Spread the three luminaries slightly within their sign so they don't overlap
          const offset = (idx - 1) * 6;
          const pos = polar(cx, cy, rPlanet, i * 30 + 15 + offset);
          return (
            <g key={p.label}>
              <circle cx={pos.x} cy={pos.y} r={11} fill={p.color} opacity={0.9} />
              <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="hsl(260 40% 10%)" fontWeight="700">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default NatalWheel;