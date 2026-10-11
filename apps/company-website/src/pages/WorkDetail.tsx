import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { CaseCard, CaseCover } from "../site/CaseCard";
import { caseStudies, industries, services } from "../site/content";
import { useT } from "../site/i18n";

const serviceName = Object.fromEntries(services.map((s) => [s.slug, s.title]));
const industryName = Object.fromEntries(industries.map((i) => [i.slug, i.name]));

const WorkDetail = () => {
  const tr = useT();
  const { slug } = useParams();
  const index = caseStudies.findIndex((c) => c.slug === slug);
  const c = caseStudies[index];
  usePageMeta(c ? `${c.client} case study` : "Our Work", c?.summary ?? "");
  if (!c) return <Navigate to="/work" replace />;

  const next = caseStudies[(index + 1) % caseStudies.length];
  const related = caseStudies.filter((o) => o.slug !== c.slug && o.services.some((s) => c.services.includes(s))).slice(0, 2);

  const facts = [
    { label: "Client", value: c.client },
    { label: "Industry", value: industryName[c.industry] },
    { label: "Location", value: c.location },
    { label: "Services", value: c.services.map((s) => serviceName[s]).join(", ") },
    { label: "Status", value: c.status },
  ];

  return (
    <Layout>
      <PageHero crumbs={[{ to: "/work", label: "Work" }, { label: c.client }]} eyebrow={c.sector} title={c.title} lede={c.summary} />

      <section className="py-16 sm:py-24">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <dl className="divide-y divide-border border-y border-border lg:sticky lg:top-28">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-6 py-4 text-sm">
                  <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr(f.label)}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
              <div className="py-4 text-sm">
                <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("Built with")}</dt>
                <dd className="mt-3 flex flex-wrap gap-2">
                  {c.stack.map((s) => (
                    <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">{s}</span>
                  ))}
                </dd>
              </div>
              {c.url && (
                <div className="py-5">
                  <a href={c.url} target="_blank" rel="noreferrer" className="btn-outline w-full">
                    Visit {c.url.replace(/^https?:\/\//, "")} <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </dl>
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal>
              <CaseCover study={c} large />
            </Reveal>

            <h2 className="mt-14 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr("The challenge")}</h2>
            <p className="mt-4 text-xl leading-relaxed">{c.challenge}</p>

            <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr("What we delivered")}</h2>
            <ul className="mt-5 space-y-4">
              {c.solution.map((s) => (
                <li key={s} className="flex gap-3 text-lg">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--brand-red))]" />
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>

            <div className="mt-14 rounded-xl bg-surface p-8">
              <p className="text-lg font-semibold">{tr("Facing a similar challenge?")}</p>
              <p className="mt-2 text-muted-foreground">
                Tell us how your team works today. We will reply within one business day with honest advice.
              </p>
              <Link to="/contact" className="btn-primary mt-6">
                {tr("Talk to us about your project")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-14 flex items-center justify-between border-t border-border pt-8">
              <Link to="/work" className="link-arrow">
                <ArrowLeft className="h-4 w-4" /> {tr("All work")}
              </Link>
              <Link to={`/work/${next.slug}`} className="link-arrow text-right">
                Next: {next.client} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-surface py-20 sm:py-24">
          <div className="wrap">
            <span className="eyebrow">{tr("Related work")}</span>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              {related.map((r) => (
                <CaseCard key={r.slug} study={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </Layout>
  );
};

export default WorkDetail;
