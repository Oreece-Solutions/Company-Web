import { useSearchParams } from "react-router-dom";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { CaseCard } from "../site/CaseCard";
import { caseStudies, industries, services, type ServiceSlug } from "../site/content";
import { useT } from "../site/i18n";

const Work = () => {
  const tr = useT();
  usePageMeta(
    "Our Work",
    "Case studies from Oreece: operations platforms, bilingual websites, tourism booking and AI automation built for real businesses.",
  );

  const [params, setParams] = useSearchParams();
  const service = params.get("service") as ServiceSlug | null;
  const industry = params.get("industry");
  const shown = caseStudies.filter(
    (c) => (!service || c.services.includes(service)) && (!industry || c.industry === industry),
  );
  const usedIndustries = industries.filter((i) => caseStudies.some((c) => c.industry === i.slug));

  const pick = (key: "service" | "industry", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Work" }]}
        eyebrow={tr("Our work")}
        title={tr("Proof, not promises.")}
        lede={tr("A selection of systems we have designed and built — from barcode-driven operations platforms to AI that runs our own marketing.")}
      />

      <section className="py-16 sm:py-24">
        <div className="wrap">
          <div className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-center lg:justify-between">
            <FilterRow label={tr("Service")} value={service} onPick={(v) => pick("service", v)} options={services.map((s) => ({ value: s.slug, label: s.title }))} />
            <FilterRow label={tr("Industry")} value={industry} onPick={(v) => pick("industry", v)} options={usedIndustries.map((i) => ({ value: i.slug, label: i.name }))} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            Showing {shown.length} of {caseStudies.length} case studies
          </p>

          {shown.length ? (
            <div className="mt-10 grid gap-x-10 gap-y-16 md:grid-cols-2">
              {shown.map((c, i) => (
                <Reveal key={c.slug} delay={(i % 2) * 90}>
                  <CaseCard study={c} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-xl bg-surface p-10 text-center">
              <p className="font-semibold">No case studies match those filters yet.</p>
              <button className="btn-outline mt-5" onClick={() => setParams({}, { replace: true })}>
                {tr("Clear filters")}
              </button>
            </div>
          )}
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

function FilterRow({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onPick: (v: string | null) => void;
}) {
  const tr = useT();
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      active ? "border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-white" : "border-border text-muted-foreground hover:border-[hsl(var(--ink))] hover:text-[hsl(var(--ink))]"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
      <span className="mr-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr(label)}</span>
      <button className={chip(!value)} aria-pressed={!value} onClick={() => onPick(null)}>
        {tr("All")}
      </button>
      {options.map((o) => (
        <button key={o.value} className={chip(value === o.value)} aria-pressed={value === o.value} onClick={() => onPick(o.value)}>
          {tr(o.label)}
        </button>
      ))}
    </div>
  );
}

export default Work;
