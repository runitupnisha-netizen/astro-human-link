/**
 * Decorative Human Design bodygraph showing the 9 centers as geometric
 * shapes. We don't yet have gate/channel data per user, so we render a
 * stylized neutral graph and highlight the centers commonly associated
 * with the user's type when possible.
 */
const CENTERS = [
  { id: "head", shape: "triangle-up", x: 100, y: 18, label: "Head" },
  { id: "ajna", shape: "triangle-down", x: 100, y: 60, label: "Ajna" },
  { id: "throat", shape: "square", x: 100, y: 105, label: "Throat" },
  { id: "g", shape: "diamond", x: 100, y: 155, label: "G" },
  { id: "heart", shape: "triangle-right", x: 60, y: 160, label: "Heart" },
  { id: "spleen", shape: "triangle-right", x: 30, y: 200, label: "Spleen" },
  { id: "solar", shape: "triangle-left", x: 170, y: 200, label: "Solar" },
  { id: "sacral", shape: "square", x: 100, y: 215, label: "Sacral" },
  { id: "root", shape: "square", x: 100, y: 275, label: "Root" },
];

const DEFINED_BY_TYPE: Record<string, string[]> = {
  Manifestor: ["throat", "heart", "solar", "root"],
  Generator: ["sacral", "root", "solar", "throat"],
  "Manifesting Generator": ["sacral", "throat", "root", "solar", "heart"],
  Projector: ["g", "ajna", "throat", "spleen"],
  Reflector: [],
};

// Channels between defined centers to give the graph richer visual structure.
const CHANNEL_PAIRS: Array<[string, string]> = [
  ["throat", "g"],
  ["throat", "ajna"],
  ["ajna", "head"],
  ["g", "sacral"],
  ["sacral", "root"],
  ["sacral", "solar"],
  ["solar", "root"],
  ["heart", "g"],
  ["heart", "throat"],
  ["spleen", "sacral"],
];

const Shape = ({ shape, x, y, defined }: { shape: string; x: number; y: number; defined: boolean }) => {
  const fill = defined ? "hsl(280 70% 60% / 0.85)" : "transparent";
  const stroke = defined ? "hsl(280 70% 75%)" : "hsl(280 30% 55% / 0.5)";
  const sw = 1.5;
  const s = 22; // half-size
  switch (shape) {
    case "square":
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "triangle-up":
      return <polygon points={`${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "triangle-down":
      return <polygon points={`${x - s},${y - s} ${x + s},${y - s} ${x},${y + s}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "triangle-right":
      return <polygon points={`${x - s},${y - s} ${x - s},${y + s} ${x + s},${y}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "triangle-left":
      return <polygon points={`${x + s},${y - s} ${x + s},${y + s} ${x - s},${y}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "diamond":
      return <polygon points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    default:
      return null;
  }
};

const BodyGraph = ({ type }: { type?: string | null }) => {
  const defined = type ? DEFINED_BY_TYPE[type] || [] : [];
  const centerMap = Object.fromEntries(CENTERS.map((c) => [c.id, c]));
  return (
    <div className="flex items-center justify-center">
      <svg width={200} height={300} viewBox="0 0 200 310" className="drop-shadow-lg">
        {CHANNEL_PAIRS.map(([a, b], i) => {
          const ca = centerMap[a];
          const cb = centerMap[b];
          if (!ca || !cb) return null;
          const bothDefined = defined.includes(a) && defined.includes(b);
          return (
            <line
              key={`ch-${i}`}
              x1={ca.x}
              y1={ca.y}
              x2={cb.x}
              y2={cb.y}
              stroke={bothDefined ? "hsl(280 70% 65% / 0.85)" : "hsl(280 30% 55% / 0.25)"}
              strokeWidth={bothDefined ? 2.5 : 1}
            />
          );
        })}
        {CENTERS.map((c) => (
          <Shape key={c.id} shape={c.shape} x={c.x} y={c.y} defined={defined.includes(c.id)} />
        ))}
      </svg>
    </div>
  );
};

export default BodyGraph;