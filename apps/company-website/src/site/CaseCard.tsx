import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "./content";

const tones: Record<CaseStudy["tone"], { bg: string; fg: string; sub: string }> = {
  ink: { bg: "bg-[hsl(var(--ink))]", fg: "text-white", sub: "text-white/55" },
  red: { bg: "bg-[hsl(var(--brand-red))]", fg: "text-white", sub: "text-white/70" },
  pounamu: { bg: "bg-[hsl(var(--pounamu))]", fg: "text-white", sub: "text-white/60" },
  sand: { bg: "bg-[hsl(var(--sand))]", fg: "text-[hsl(var(--ink))]", sub: "text-[hsl(var(--ink)/0.55)]" },
};

function BrowserFrame({ url, children }: { url?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-t-lg bg-white shadow-[0_24px_60px_-20px_hsl(222_47%_7%/0.55)] ring-1 ring-black/10">
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-[hsl(220_16%_96%)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
        <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        {url && (
          <span className="ml-3 truncate rounded bg-white px-2 py-0.5 text-[10px] font-medium text-black/50">
            {url.replace(/^https?:\/\//, "")}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// Illustrative product UI for systems that run behind a login and have no public page to capture.
function JcpMock() {
  const cols = [
    { name: "Strip", n: 6 },
    { name: "Photo & QC", n: 4 },
    { name: "Put-away", n: 3 },
    { name: "Active stock", n: 5 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 bg-[hsl(220_20%_97%)] p-3">
      {cols.map((c, i) => (
        <div key={c.name} className="rounded-md bg-white p-2 ring-1 ring-black/5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-black/50">{c.name}</p>
          <div className="mt-2 space-y-1.5">
            {Array.from({ length: Math.min(c.n, 4) }).map((_, j) => (
              <div key={j} className="rounded border border-black/5 p-1.5">
                <div className="h-1.5 w-3/4 rounded bg-black/15" />
                <div className="mt-1 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${i === 3 ? "bg-emerald-500" : j === 0 ? "bg-amber-400" : "bg-sky-400"}`} />
                  <div className="h-1 w-1/2 rounded bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialMock() {
  return (
    <div className="grid grid-cols-5 gap-2 bg-[hsl(220_20%_97%)] p-3">
      <div className="col-span-3 rounded-md bg-white p-3 ring-1 ring-black/5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-black/50">Awaiting approval</p>
        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-full rounded bg-black/15" />
          <div className="h-1.5 w-11/12 rounded bg-black/10" />
          <div className="h-1.5 w-4/5 rounded bg-black/10" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-semibold text-white">Approve</span>
          <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-semibold text-black/60">Revise</span>
        </div>
      </div>
      <div className="col-span-2 space-y-2">
        {["Research", "Copy", "QA", "Schedule"].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 ring-1 ring-black/5">
            <span className={`h-1.5 w-1.5 rounded-full ${i < 3 ? "bg-emerald-500" : "bg-black/20"}`} />
            <span className="text-[9px] font-medium text-black/60">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const mocks: Record<string, () => JSX.Element> = {
  "jcp-car-parts": JcpMock,
  "oreece-social-os": SocialMock,
};

export function CaseCover({ study, large = false }: { study: CaseStudy; large?: boolean }) {
  const t = tones[study.tone];
  const Mock = mocks[study.slug];
  return (
    <div className={`relative flex aspect-[4/3] flex-col overflow-hidden rounded-xl sm:aspect-[16/11] ${t.bg} ${t.fg}`}>
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className={`relative flex items-center justify-between px-6 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] sm:px-8 sm:pt-7 ${t.sub}`}>
        <span>{study.sector}</span>
        <span>{study.location}</span>
      </div>
      <p className={`relative px-6 pt-3 font-display font-semibold leading-none tracking-tight sm:px-8 ${large ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
        {study.client}
      </p>
      <div className="relative mt-auto px-6 pt-6 sm:px-10">
        {study.image ? (
          <BrowserFrame url={study.url}>
            <img src={study.image} alt={`${study.client} website`} loading="lazy" className="block aspect-[16/9] w-full object-cover object-top" />
          </BrowserFrame>
        ) : Mock ? (
          <BrowserFrame>
            <Mock />
          </BrowserFrame>
        ) : null}
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
      <div className="mt-5 flex flex-wrap gap-2">
        {study.stack.map((s) => (
          <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {s}
          </span>
        ))}
      </div>
      <h3 className="mt-4 text-xl font-semibold leading-snug text-[hsl(var(--ink))] group-hover:underline group-hover:underline-offset-4">
        {study.title}
      </h3>
      <p className="mt-2 text-muted-foreground">{study.summary}</p>
      <span className="link-arrow mt-4">
        Read the case study <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
