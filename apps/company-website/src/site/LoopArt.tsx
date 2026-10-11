import type { ServiceSlug } from "./content";

// Looping illustrations for the full-bleed service panels. Pure SVG + CSS keyframes
// (see .loop-* in index.css), so they cost nothing to load and stop under reduced motion.

function SoftwareArt() {
  const tiles = [
    { x: 70, y: 70, label: "TS", bg: "#3178c6", fg: "#fff", d: 0 },
    { x: 300, y: 40, label: "SQL", bg: "#fff", fg: "#b0001c", d: 0.8 },
    { x: 330, y: 190, label: "API", bg: "#111827", fg: "#fff", d: 1.6 },
    { x: 40, y: 210, label: "PWA", bg: "#fbbf24", fg: "#111827", d: 2.4 },
    { x: 190, y: 20, label: "</>", bg: "#fff", fg: "#111827", d: 1.2 },
  ];
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full" aria-hidden>
      {/* Light beams falling into the platform */}
      {[178, 194, 210, 226].map((x, i) => (
        <rect key={x} x={x} y="-40" width="3" height="170" fill="white" opacity="0.5" className="loop-beam" style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
      {/* Isometric platform */}
      <g className="loop-float-slow">
        <path d="M200 150 L330 210 L200 270 L70 210 Z" fill="none" stroke="#1a0006" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M200 175 L270 208 L200 241 L130 208 Z" fill="white" />
        <path d="M200 241 L270 208 L270 216 L200 249 Z" fill="#ffd5da" />
        <path d="M200 241 L130 208 L130 216 L200 249 Z" fill="#ffe8eb" />
        <circle cx="200" cy="208" r="7" fill="hsl(var(--brand-red))" className="loop-breathe" />
      </g>
      {tiles.map((t) => (
        <g key={t.label} className="loop-float" style={{ animationDelay: `-${t.d}s` }}>
          <rect x={t.x} y={t.y} width="56" height="56" rx="12" fill={t.bg} />
          <text x={t.x + 28} y={t.y + 35} textAnchor="middle" fontSize="17" fontWeight="800" fill={t.fg} fontFamily="ui-monospace, monospace">
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AiArt() {
  const nodes: [number, number, number][] = [
    [200, 160, 22], [80, 70, 8], [70, 230, 10], [320, 60, 9], [340, 240, 8], [140, 150, 6], [260, 110, 6], [270, 220, 7], [200, 40, 7], [200, 290, 7],
  ];
  const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [1, 5], [2, 5], [3, 6], [4, 7], [8, 6], [9, 7]];
  const curve = (a: number, b: number) => {
    const [x1, y1] = nodes[a];
    const [x2, y2] = nodes[b];
    const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18;
    const my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
    return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  };
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full" aria-hidden>
      {edges.map(([a, b], i) => (
        <g key={i}>
          <path d={curve(a, b)} fill="none" stroke="#7dd3fc" strokeOpacity="0.35" strokeWidth="1.5" />
          <path
            d={curve(a, b)}
            fill="none"
            stroke="#cffafe"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={100}
            className="loop-signal"
            style={{ animationDelay: `${(i * 0.37) % 3}s` }}
          />
        </g>
      ))}
      {nodes.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill={i === 0 ? "#67e8f9" : "#38bdf8"}
          fillOpacity={i === 0 ? 1 : 0.85}
          className={i === 0 ? "loop-breathe" : "loop-twinkle"}
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
      <circle cx="200" cy="160" r="22" fill="none" stroke="#67e8f9" strokeWidth="2" className="loop-ripple" />
      <circle cx="200" cy="160" r="22" fill="none" stroke="#67e8f9" strokeWidth="2" className="loop-ripple" style={{ animationDelay: "1.5s" }} />
    </svg>
  );
}

function MarketingArt() {
  const bars = [60, 95, 80, 130, 115, 170, 205];
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full" aria-hidden>
      {[80, 140, 200, 260].map((y) => (
        <line key={y} x1="30" x2="370" y1={y} y2={y} stroke="white" strokeOpacity="0.12" />
      ))}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={48 + i * 46}
          y={270 - h}
          width="26"
          height={h}
          rx="5"
          fill="white"
          fillOpacity={0.18 + i * 0.1}
          className="loop-bar"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      <path
        d="M61 220 L107 185 L153 200 L199 150 L245 165 L291 110 L337 70"
        fill="none"
        stroke="#fde68a"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className="loop-line"
      />
      <g className="loop-pop-badge">
        <rect x="262" y="22" width="112" height="34" rx="17" fill="white" />
        <text x="318" y="44" textAnchor="middle" fontSize="13" fontWeight="700" fill="#065f46">
          ▲ New enquiry
        </text>
      </g>
      <circle cx="337" cy="70" r="7" fill="#fde68a" className="loop-breathe" />
    </svg>
  );
}

export const panelTone: Record<ServiceSlug, string> = {
  software: "bg-[hsl(var(--brand-red))]",
  ai: "bg-[hsl(205_85%_24%)]",
  marketing: "bg-[hsl(var(--pounamu))]",
};

export function LoopArt({ kind }: { kind: ServiceSlug }) {
  if (kind === "software") return <SoftwareArt />;
  if (kind === "ai") return <AiArt />;
  return <MarketingArt />;
}
