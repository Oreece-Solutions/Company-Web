import { ReactNode, useEffect, useRef, useState } from "react";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 0 → 1 as the element travels through the viewport (or its sticky track). */
function useScrollProgress<T extends HTMLElement>(mode: "through" | "track") {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const v = mode === "track" ? -r.top / Math.max(1, r.height - vh) : (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      setP(Math.min(1, Math.max(0, v)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mode]);
  return [ref, p] as const;
}

/** Large statement whose words light up as the reader scrolls past. */
export function ScrollWords({ text, className = "" }: { text: string; className?: string }) {
  const [ref, p] = useScrollProgress<HTMLParagraphElement>("through");
  const words = text.split(" ");
  const lit = reduceMotion() ? words.length : p * words.length * 1.15;
  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="transition-colors duration-300" style={{ color: i < lit ? "hsl(var(--ink))" : "hsl(var(--ink) / 0.16)" }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/** Pins a row of cards and slides it sideways while the page scrolls (desktop only). */
export function HorizontalScroller({ children, header }: { children: ReactNode; header: ReactNode }) {
  const [ref, p] = useScrollProgress<HTMLDivElement>("track");
  const rowRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => setEnabled(window.innerWidth >= 1024 && !reduceMotion());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Re-measure once the pinned layout is rendered, and whenever images or the viewport change size.
  useEffect(() => {
    if (!enabled) return;
    const row = rowRef.current;
    if (!row) return;
    const measure = () => setShift(Math.max(0, row.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <div>
        {header}
        <div ref={rowRef} className="wrap mt-12 grid gap-12 md:grid-cols-2">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height: `calc(100vh + ${shift}px)` }} className="relative">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-20">
        {header}
        <div
          ref={rowRef}
          className="mt-12 flex w-max gap-10 pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-12 will-change-transform"
          style={{ transform: `translate3d(${-p * shift}px,0,0)` }}
        >
          {children}
        </div>
        <div className="wrap mt-10">
          <div className="h-[2px] w-full overflow-hidden rounded bg-[hsl(var(--ink)/0.08)]">
            <div className="h-full origin-left bg-[hsl(var(--brand-red))]" style={{ transform: `scaleX(${p})` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Animated line illustrations for each service card; they draw in when revealed. */
export function ServiceArt({ kind }: { kind: "software" | "ai" | "marketing" }) {
  if (kind === "software") {
    const rows = [
      [0, 46, "#e11d48"], [1, 70, "#94a3b8"], [1, 38, "#22c55e"], [2, 54, "#a855f7"], [2, 30, "#94a3b8"],
      [1, 62, "#0ea5e9"], [0, 34, "#f59e0b"], [1, 50, "#94a3b8"], [2, 42, "#22c55e"],
    ] as const;
    return (
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
        {rows.map(([indent, w, c], i) => (
          <g key={i}>
            <circle className="pop" cx="14" cy={18 + i * 18} r="3" fill="hsl(222 20% 70%)" style={{ transitionDelay: `${i * 80}ms` }} />
            <line
              className="draw"
              x1={34 + indent * 18}
              x2={34 + indent * 18 + w * 2.6}
              y1={18 + i * 18}
              y2={18 + i * 18}
              stroke={c}
              strokeWidth="5"
              strokeLinecap="round"
              style={{ ["--len" as string]: 220, transitionDelay: `${i * 110}ms` }}
            />
          </g>
        ))}
      </svg>
    );
  }
  if (kind === "ai") {
    const nodes = [
      [40, 40], [40, 140], [140, 90], [240, 30], [240, 150], [290, 90],
    ];
    const edges = [[0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]];
    return (
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
        {edges.map(([a, b], i) => (
          <path
            key={i}
            className="draw"
            d={`M${nodes[a][0]},${nodes[a][1]} C${(nodes[a][0] + nodes[b][0]) / 2},${nodes[a][1]} ${(nodes[a][0] + nodes[b][0]) / 2},${nodes[b][1]} ${nodes[b][0]},${nodes[b][1]}`}
            fill="none"
            stroke="hsl(var(--brand-red))"
            strokeWidth="2.5"
            style={{ ["--len" as string]: 260, transitionDelay: `${i * 180}ms` }}
          />
        ))}
        {nodes.map(([x, y], i) => (
          <g key={i} className="pop" style={{ transitionDelay: `${300 + i * 120}ms` }}>
            <circle cx={x} cy={y} r={i === 2 ? 16 : 9} fill={i === 2 ? "hsl(var(--brand-red))" : "white"} stroke="hsl(var(--brand-red))" strokeWidth="2.5" />
            {i === 2 && <circle className="pulse-dot" cx={x} cy={y} r="5" fill="white" />}
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="white" strokeOpacity="0.12" />
      ))}
      <path
        className="draw"
        d="M0,150 C40,148 60,120 95,122 C130,124 140,150 175,135 C215,118 220,70 255,62 C280,56 295,40 320,22"
        fill="none"
        stroke="white"
        strokeWidth="3"
        style={{ ["--len" as string]: 420 }}
      />
      <path
        className="draw"
        d="M0,165 C40,163 60,140 95,142 C130,144 140,165 175,155 C215,142 220,100 255,92 C280,86 295,72 320,58"
        fill="none"
        stroke="#7c9cff"
        strokeWidth="3"
        style={{ ["--len" as string]: 420, transitionDelay: "250ms" }}
      />
      <circle className="pop" cx="320" cy="22" r="6" fill="white" style={{ transitionDelay: "2s" }} />
      <g className="pop" style={{ transitionDelay: "2.2s" }}>
        <rect x="214" y="6" width="92" height="26" rx="6" fill="#dcfce7" />
        <text x="260" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="#15803d">
          ▲ Enquiries
        </text>
      </g>
    </svg>
  );
}
