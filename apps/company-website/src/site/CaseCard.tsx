import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "./content";

const tones: Record<CaseStudy["tone"], { bg: string; fg: string; sub: string }> = {
  ink: { bg: "bg-[hsl(var(--ink))]", fg: "text-white", sub: "text-white/55" },
  red: { bg: "bg-[hsl(var(--brand-red))]", fg: "text-white", sub: "text-white/70" },
  pounamu: { bg: "bg-[hsl(var(--pounamu))]", fg: "text-white", sub: "text-white/60" },
  sand: { bg: "bg-[hsl(var(--sand))]", fg: "text-[hsl(var(--ink))]", sub: "text-[hsl(var(--ink)/0.55)]" },
};

export function CaseCover({ study, large = false }: { study: CaseStudy; large?: boolean }) {
  const t = tones[study.tone];
  return (
    <div className={`relative flex aspect-[16/10] flex-col justify-between overflow-hidden rounded-xl p-6 sm:p-8 ${t.bg} ${t.fg}`}>
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className={`relative flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] ${t.sub}`}>
        <span>{study.sector}</span>
        <span>{study.location}</span>
      </div>
      <div className="relative">
        <p className={`font-display font-semibold leading-none tracking-tight ${large ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}>
          {study.client}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {study.stack.map((s) => (
            <span key={s} className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium opacity-80" style={{ borderColor: "currentColor" }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CaseCard({ study }: { study: CaseStudy }) {
  return (
    <Link to={`/work#${study.slug}`} className="group block">
      <div className="transition-transform duration-300 group-hover:-translate-y-1">
        <CaseCover study={study} />
      </div>
      <h3 className="mt-5 text-xl font-semibold leading-snug text-[hsl(var(--ink))] group-hover:underline group-hover:underline-offset-4">
        {study.title}
      </h3>
      <p className="mt-2 text-muted-foreground">{study.summary}</p>
      <span className="link-arrow mt-4">
        Read the case study <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
