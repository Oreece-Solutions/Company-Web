import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { caseStudies, industries } from "../site/content";
import { useT } from "../site/i18n";

const Industries = () => {
  const tr = useT();
  usePageMeta(
    "Industries",
    "Software, AI automation and digital marketing for New Zealand automotive, tourism, trades, professional services, retail and not-for-profit organisations.",
  );

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Industries" }]}
        eyebrow={tr("Industries")}
        title={tr("Built around how your sector works.")}
        lede={tr("Every industry has its own workflows, rules and customers. We start there — then build the system, automation or campaign that fits.")}
      >
        <nav className="mt-10 flex flex-wrap gap-3" aria-label={tr("Industries")}>
          {industries.map((i) => (
            <a key={i.slug} href={`#${i.slug}`} className="btn-outline-light py-2.5">
              {tr(i.name)}
            </a>
          ))}
        </nav>
      </PageHero>

      <section className="py-16 sm:py-24">
        <div className="wrap divide-y divide-border">
          {industries.map((ind, idx) => {
            // Social OS is our own product, not client work in that sector.
            const work = caseStudies.filter((c) => c.industry === ind.slug && c.slug !== "oreece-social-os");
            return (
              <Reveal key={ind.slug}>
                <article id={ind.slug} className="grid scroll-mt-28 gap-10 py-14 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red))]">{String(idx + 1).padStart(2, "0")}</span>
                    <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{tr(ind.name)}</h2>
                    <p className="lede mt-4">{ind.summary}</p>
                  </div>
                  <div className="lg:col-span-6 lg:col-start-7">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr("What we build")}</h3>
                    <ul className="mt-4 space-y-3">
                      {ind.builds.map((b) => (
                        <li key={b} className="flex gap-3 text-lg font-medium">
                          <Check className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--pounamu))]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                      {work.map((c) => (
                        <Link key={c.slug} to={`/work/${c.slug}`} className="link-arrow">
                          Case study: {c.client} <ArrowRight className="h-4 w-4" />
                        </Link>
                      ))}
                      <Link to="/contact" className="link-arrow text-[hsl(var(--brand-red))]">
                        Discuss your {ind.name.toLowerCase()} project <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

export default Industries;
