import { Link } from "react-router-dom";
import { partners } from "./content";

// Text wordmarks with a monogram badge, so every partner gets equal weight until real logos are supplied.

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

function Mark({ name, i }: { name: string; i: number }) {
  return (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${badgeTones[i % badgeTones.length]}`}>
        {initials(name)}
      </span>
      <span className="whitespace-nowrap font-display text-xl font-semibold tracking-tight sm:text-2xl">{name}</span>
    </>
  );
}

const itemClass =
  "flex items-center gap-4 rounded-2xl border border-border bg-white px-6 py-4 text-[hsl(var(--ink)/0.8)] transition-colors";

export function PartnerMarquee() {
  const loop = [...partners, ...partners];
  return (
    <div className="marquee-wrap overflow-hidden">
      <div className="marquee flex w-max gap-4">
        {loop.map((p, k) => {
          const i = k % partners.length;
          const hidden = k >= partners.length;
          return p.href ? (
            <Link key={k} to={p.href} tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined} className={`${itemClass} hover:border-[hsl(var(--ink))] hover:text-[hsl(var(--ink))]`}>
              <Mark name={p.name} i={i} />
            </Link>
          ) : (
            <div key={k} aria-hidden={hidden || undefined} className={itemClass}>
              <Mark name={p.name} i={i} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PartnerGrid() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {partners.map((p, i) => (
        <li key={p.name} className="bg-white">
          {p.href ? (
            <Link to={p.href} className="flex items-center gap-4 p-6 transition-colors hover:bg-surface sm:p-8">
              <Mark name={p.name} i={i} />
            </Link>
          ) : (
            <div className="flex items-center gap-4 p-6 sm:p-8">
              <Mark name={p.name} i={i} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
