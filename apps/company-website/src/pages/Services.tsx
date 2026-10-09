import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { CaseCard } from "../site/CaseCard";
import { caseStudies, process, services } from "../site/content";

const engagements = [
  {
    title: "Fixed-scope project",
    body: "A defined outcome, timeline and price in NZD. Ideal for new systems, websites and automations.",
  },
  {
    title: "Monthly partnership",
    body: "A dedicated team on a retainer for continuous improvement, support and growth marketing.",
  },
  {
    title: "Discovery sprint",
    body: "Two weeks to map the problem, prototype the solution and price the build — with no commitment beyond it.",
  },
];

const Services = () => {
  usePageMeta(
    "Services",
    "Custom software and platforms, AI and automation, and digital marketing for New Zealand businesses — delivered by one accountable team.",
  );

  return (
    <Layout>
      <PageHero
        eyebrow="Services"
        title="Everything you need to build, automate and grow."
        lede="Three capabilities that work best together — so the system you build, the work you automate and the customers you win all live in one joined-up picture."
      >
        <nav className="mt-10 flex flex-wrap gap-3" aria-label="Services">
          {services.map((s) => (
            <a key={s.slug} href={`#${s.slug}`} className="btn-outline-light py-2.5">
              {s.title}
            </a>
          ))}
        </nav>
      </PageHero>

      {services.map((s, idx) => {
        const related = caseStudies.filter((c) => c.services.includes(s.slug)).slice(0, 2);
        return (
          <section key={s.slug} id={s.slug} className={`py-20 sm:py-28 ${idx % 2 ? "bg-surface" : ""}`}>
            <div className="wrap">
              <div className="grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red))]">{s.eyebrow}</span>
                  <h2 className="h-section mt-3">{s.title}</h2>
                  <p className="lede mt-5">{s.summary}</p>
                  <ul className="mt-8 space-y-3">
                    {s.outcomes.map((o) => (
                      <li key={o} className="flex gap-3 font-medium">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--pounamu))]" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-6 lg:col-start-7">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capabilities</h3>
                  <ul className="mt-4 divide-y divide-border border-y border-border">
                    {s.capabilities.map((c) => (
                      <li key={c} className="py-4 text-lg font-medium">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {related.length > 0 && (
                <div className="mt-16">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Related work</h3>
                  <div className="mt-6 grid gap-10 md:grid-cols-2">
                    {related.map((c) => (
                      <Reveal key={c.slug}>
                        <CaseCard study={c} />
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      <section className="bg-[hsl(var(--ink))] py-20 text-white sm:py-28">
        <div className="wrap">
          <span className="eyebrow eyebrow-light">Ways to engage</span>
          <h2 className="h-section mt-4 max-w-3xl">Start small, scale when it is working.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-3">
            {engagements.map((e) => (
              <div key={e.title} className="bg-[hsl(var(--ink))] p-8">
                <h3 className="text-xl font-semibold">{e.title}</h3>
                <p className="mt-3 leading-relaxed text-white/60">{e.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <div key={p.step} className="border-t border-white/15 pt-5">
                <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red-light))]">
                  {String(i + 1).padStart(2, "0")} — {p.step}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{p.body}</p>
              </div>
            ))}
          </div>
          <Link to="/contact" className="btn-primary mt-14">
            Book a discovery call <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

export default Services;
