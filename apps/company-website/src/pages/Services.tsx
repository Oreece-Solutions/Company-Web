import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { LoopArt, panelTone } from "../site/LoopArt";
import { FaqList } from "../site/Faq";
import { caseStudies, engagements, faqs, process, services } from "../site/content";
import { useT } from "../site/i18n";

const Services = () => {
  const tr = useT();
  usePageMeta(
    "Services",
    "Custom software and platforms, AI and automation, and digital marketing for businesses in New Zealand and worldwide — delivered by one accountable team.",
  );

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Services" }]}
        eyebrow={tr("Services")}
        title={tr("Everything you need to build, automate and grow.")}
        lede={tr("Three capabilities that work best together — so the system you build, the work you automate and the customers you win all live in one joined-up picture.")}
      >
        <nav className="mt-10 flex flex-wrap gap-3" aria-label={tr("Services")}>
          {services.map((s) => (
            <a key={s.slug} href={`#${s.slug}`} className="btn-outline-light py-2.5">
              {tr(s.title)}
            </a>
          ))}
        </nav>
      </PageHero>

      <section className="glow-soft py-20 text-center sm:py-28">
        <div className="wrap">
          <h2 className="h-section mx-auto max-w-4xl">{tr("Design, build and run — with one accountable team.")}</h2>
          <p className="lede mx-auto mt-5 max-w-2xl">
            Each capability stands on its own, and they work best together: the system you build, the work you automate
            and the customers you win, in one joined-up picture.
          </p>
        </div>
      </section>

      <div className="border-t border-border">
        {services.map((s, idx) => {
          const related = caseStudies.filter((c) => c.services.includes(s.slug)).slice(0, 2);
          const flip = idx % 2 === 1;
          return (
            <section key={s.slug} id={s.slug} className="grid scroll-mt-20 lg:grid-cols-2">
              <div className={`relative min-h-[320px] overflow-hidden sm:min-h-[420px] ${panelTone[s.slug]} ${flip ? "lg:order-2" : ""}`}>
                <div className="grid-lines absolute inset-0" aria-hidden />
                <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-14">
                  <LoopArt kind={s.slug} />
                </div>
              </div>
              <div className="flex flex-col justify-center px-4 py-16 sm:px-12 lg:px-16 lg:py-24 xl:px-20">
                <Reveal>
                  <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red))]">{s.eyebrow}</span>
                  <h2 className="h-section mt-3">{tr(s.title)}</h2>
                  <p className="lede mt-5">{s.summary}</p>
                  <ul className="mt-8 space-y-3">
                    {s.outcomes.map((o) => (
                      <li key={o} className="flex gap-3 font-medium">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--pounamu))]" />
                        {o}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {s.capabilities.map((c) => (
                      <span key={c} className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                  {related.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                      {related.map((c) => (
                        <Link key={c.slug} to={`/work/${c.slug}`} className="link-arrow">
                          Case study: {c.client} <ArrowRight className="h-4 w-4" />
                        </Link>
                      ))}
                    </div>
                  )}
                </Reveal>
              </div>
            </section>
          );
        })}
      </div>

      <section id="engage" className="scroll-mt-20 bg-[hsl(var(--ink))] py-20 text-white sm:py-28">
        <div className="wrap">
          <span className="eyebrow eyebrow-light">{tr("Ways to engage")}</span>
          <h2 className="h-section mt-4 max-w-3xl">{tr("Start small, scale when it is working.")}</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-3">
            {engagements.map((e) => (
              <div key={e.title} className="flex flex-col bg-[hsl(var(--ink))] p-8">
                <h3 className="text-xl font-semibold">{e.title}</h3>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--brand-red-light))]">{e.fit}</p>
                <p className="mt-4 leading-relaxed text-white/60">{e.body}</p>
                <ul className="mt-6 space-y-2 border-t border-white/10 pt-6 text-sm text-white/80">
                  {e.includes.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--brand-red-light))]" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <div key={p.step} className="border-t border-white/15 pt-5">
                <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red-light))]">
                  {String(i + 1).padStart(2, "0")} — {tr(p.step)}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{p.body}</p>
              </div>
            ))}
          </div>
          <Link to="/contact" className="btn-primary mt-14">
            {tr("Book a discovery call")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="eyebrow">{tr("FAQ")}</span>
            <h2 className="h-section mt-4">{tr("Questions buyers ask us.")}</h2>
            <p className="lede mt-5">Something else on your mind? Ask us directly — we answer honestly.</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

export default Services;
