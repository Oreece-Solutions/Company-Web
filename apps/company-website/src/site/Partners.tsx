import { Link } from "react-router-dom";
import { partners } from "./content";

// Partner logos where we have them; a monogram and wordmark otherwise, so nobody looks like an afterthought.

type Partner = (typeof partners)[number];

const badgeTones = [
  "bg-[hsl(var(--brand-red))] text-white",
  "bg-[hsl(var(--ink))] text-white",
  "bg-[hsl(var(--pounamu))] text-white",
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => !/^(limited|ltd)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Mark({ p, i }: { p: Partner; i: number }) {
  if (p.logo) return <img src={p.logo} alt={p.name} loading="lazy" className="h-16 w-auto max-w-[190px] object-contain" />;
  return (
    <span className="flex items-center gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${badgeTones[i % badgeTones.length]}`}>
        {initials(p.name)}
      </span>
      <span className="whitespace-nowrap font-display text-xl font-semibold tracking-tight text-[hsl(var(--ink)/0.85)]">{p.name}</span>
    </span>
  );
}

const tile = (p: Partner) =>
  `flex h-24 items-center justify-center rounded-2xl border px-8 transition-colors ${
    p.dark ? "border-[hsl(var(--ink))] bg-[hsl(var(--ink))]" : "border-border bg-white"
  } ${p.href ? (p.dark ? "hover:bg-[hsl(var(--ink)/0.9)]" : "hover:border-[hsl(var(--ink)/0.4)]") : ""}`;

function Tile({ p, i, hidden = false, className = "" }: { p: Partner; i: number; hidden?: boolean; className?: string }) {
  const cls = `${tile(p)} ${className}`;
  return p.href ? (
    <Link to={p.href} tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined} aria-label={p.logo ? `${p.name} case study` : undefined} className={cls}>
      <Mark p={p} i={i} />
    </Link>
  ) : (
    <div aria-hidden={hidden || undefined} className={cls}>
      <Mark p={p} i={i} />
    </div>
  );
}

export function PartnerMarquee() {
  const loop = [...partners, ...partners];
  return (
    <div className="marquee-wrap overflow-hidden">
      <div className="marquee flex w-max gap-4">
        {loop.map((p, k) => (
          <Tile key={k} p={p} i={k % partners.length} hidden={k >= partners.length} className="min-w-[240px] shrink-0" />
        ))}
      </div>
    </div>
  );
}

export function PartnerGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {partners.map((p, i) => (
        <li key={p.name}>
          <Tile p={p} i={i} className="h-32" />
        </li>
      ))}
    </ul>
  );
}
