import { ArrowUpRight, Check } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { CaseCover } from "../site/CaseCard";
import { caseStudies, services } from "../site/content";

const serviceName = Object.fromEntries(services.map((s) => [s.slug, s.title]));

const Work = () => {
  usePageMeta(
    "Our Work",
    "Case studies from Oreece: operations platforms, bilingual websites, tourism booking and AI automation built for real businesses.",
  );

  return (
    <Layout>
      <PageHero
        eyebrow="Our work"
        title="Proof, not promises."
        lede="A selection of systems we have designed and built — from barcode-driven operations platforms to AI that runs our own marketing."
      >
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/70" aria-label="Case studies">
          {caseStudies.map((c) => (
            <a key={c.slug} href={`#${c.slug}`} className="hover:text-white">
              {c.client}
            </a>
          ))}
        </nav>
      </PageHero>

      {caseStudies.map((c, i) => (
        <section key={c.slug} id={c.slug} className={`py-20 sm:py-28 ${i % 2 ? "bg-surface" : ""}`}>
          <div className="wrap grid gap-12 lg:grid-cols-12">
            <Reveal className={`lg:col-span-6 ${i % 2 ? "lg:order-2" : ""}`}>
              <CaseCover study={c} large />
            </Reveal>
            <div className="lg:col-span-6">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {c.services.map((s) => (
                  <span key={s} className="rounded-full bg-[hsl(var(--brand-red)/0.08)] px-3 py-1 text-[hsl(var(--brand-red-dark))]">
                    {serviceName[s]}
                  </span>
                ))}
                <span className="rounded-full bg-[hsl(var(--pounamu)/0.1)] px-3 py-1 text-[hsl(var(--pounamu))]">{c.status}</span>
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">{c.title}</h2>
              <p className="lede mt-5">{c.summary}</p>

              <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">The challenge</h3>
              <p className="mt-3 leading-relaxed">{c.challenge}</p>

              <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">What we delivered</h3>
              <ul className="mt-4 space-y-3">
                {c.solution.map((s) => (
                  <li key={s} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--brand-red))]" />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>

              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" className="btn-outline mt-10">
                  Visit {c.url.replace(/^https?:\/\//, "")} <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </section>
      ))}

      <CtaBand />
    </Layout>
  );
};

export default Work;
