import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, MapPin, FileCheck2, KeyRound } from "lucide-react";
import { Layout, Reveal, CtaBand, SplitWords, usePageMeta } from "../site/Layout";
import { CaseCard } from "../site/CaseCard";
import { HorizontalScroller, ScrollWords, ServiceArt } from "../site/Motion";
import { FaqList } from "../site/Faq";
import { caseStudies, faqs, industries, principles, process, services, technologies } from "../site/content";
import { useT } from "../site/i18n";
import { PartnerMarquee } from "../site/Partners";

const principleIcons = [MapPin, FileCheck2, KeyRound, ShieldCheck];

const cardStyle = {
  software: { box: "bg-[hsl(var(--surface-secondary))] text-[hsl(var(--ink))]", chip: "bg-[hsl(var(--ink)/0.08)] text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink))] hover:text-white" },
  ai: { box: "bg-[hsl(var(--ink))] text-white", chip: "border border-white/20 text-white hover:bg-white hover:text-[hsl(var(--ink))]" },
  marketing: { box: "bg-[hsl(222_40%_11%)] text-white", chip: "border border-white/20 text-white hover:bg-white hover:text-[hsl(var(--ink))]" },
};

const Index = () => {
  const tr = useT();
  usePageMeta(
    "Oreece",
    "Oreece builds custom software, AI automation and digital marketing for businesses in New Zealand and around the world. One accountable team, fixed-scope proposals and code you own.",
  );

  return (
    <Layout>
      {/* Hero — inset frame */}
      <div className="p-2">
        <section className="relative flex min-h-[92vh] flex-col overflow-hidden rounded-2xl bg-[hsl(var(--ink))] text-white">
          <div className="hero-aurora" aria-hidden />
          <div className="grid-lines absolute inset-0" aria-hidden />

          <div className="pointer-events-none absolute right-[-7%] top-[14%] hidden w-[42%] lg:block" aria-hidden>
            <div className="anim-fade-up rotate-[-5deg] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10" style={{ animationDelay: "500ms" }}>
              <img src="/work/lucky-ceylon.jpg" alt="" className="block w-full" />
            </div>
            <div className="anim-fade-up -mt-[38%] ml-[12%] rotate-[3deg] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10" style={{ animationDelay: "700ms" }}>
              <img src="/work/rusteze.jpg" alt="" className="block w-full" />
            </div>
            <div className="anim-fade-up -mt-[30%] ml-[34%] w-[66%] rotate-[-2deg] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10" style={{ animationDelay: "900ms" }}>
              <img src="/work/jcp.jpg" alt="" className="block w-full" />
            </div>
          </div>

          <div className="wrap relative mt-auto pb-10 pt-40 sm:pb-14">
            <span className="eyebrow eyebrow-light anim-fade-up">{tr("Kia ora — a technology partner from Aotearoa New Zealand")}</span>
            <h1 className="mt-6 max-w-[50rem] text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl lg:text-[4.75rem] xl:text-[5.25rem]">
              <SplitWords text={tr("Software, AI and growth for ambitious businesses.")} delay={150} />
            </h1>
            <p className="anim-fade-up mt-7 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl" style={{ animationDelay: "700ms" }}>
              {tr("From New Zealand to the world, we design and build the systems, automations and websites that help businesses run leaner and grow faster.")}
            </p>
            <div className="anim-fade-up mt-9 flex flex-wrap gap-3" style={{ animationDelay: "850ms" }}>
              <Link to="/contact" className="btn-primary">
                {tr("Book a free consultation")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/work" className="btn-outline-light">
                {tr("See our work")}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Partners */}
      <section className="border-b border-border py-14 sm:py-16">
        <div className="wrap mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">{tr("Our partners")}</span>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{tr("Businesses we are proud to work with.")}</h2>
          </div>
          <Link to="/contact" className="link-arrow text-[hsl(var(--brand-red))]">
            {tr("Your business next")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PartnerMarquee />
      </section>

      {/* Statement */}
      <section className="glow-soft py-24 sm:py-36">
        <div className="wrap">
          <ScrollWords
            className="mx-auto max-w-5xl text-center font-display text-3xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.6rem]"
            text={tr("Ambitious businesses in New Zealand and around the world use Oreece to replace busywork with software, put AI to work responsibly and turn attention into customers.")}
          />
        </div>
      </section>

      {/* Services */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto grid max-w-[1400px] gap-5 px-3 sm:px-5 lg:grid-cols-2">
          {services.map((s, i) => {
            const st = cardStyle[s.slug];
            const wide = i === 2;
            return (
              <Reveal key={s.slug} delay={i * 100} className={wide ? "lg:col-span-2" : ""}>
                <div className={`relative grid h-full overflow-hidden rounded-2xl p-8 sm:p-10 ${st.box} ${wide ? "lg:grid-cols-2 lg:gap-12" : ""}`}>
                  <div className="flex flex-col">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-3xl font-semibold sm:text-4xl">{tr(s.title)}</h2>
                      <span className="font-display text-sm font-semibold opacity-50">{s.eyebrow}</span>
                    </div>
                    <p className="mt-4 max-w-lg leading-relaxed opacity-70">{s.summary}</p>
                    {!wide && (
                      <div className="my-8 h-44 sm:h-52">
                        <ServiceArt kind={s.slug} />
                      </div>
                    )}
                    <div className={wide ? "mt-8 lg:mt-auto" : "mt-auto"}>
                      <Chips slug={s.slug} chip={st.chip} items={s.capabilities.slice(0, 4)} />
                    </div>
                  </div>
                  {wide && (
                    <div className="mt-8 h-48 sm:h-60 lg:mt-0 lg:h-auto lg:min-h-[260px]">
                      <ServiceArt kind={s.slug} />
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Selected work — pinned horizontal scroll on desktop */}
      <section className="bg-surface py-20 lg:py-0">
        <HorizontalScroller
          header={
            <div className="wrap flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">{tr("Selected work")}</span>
                <h2 className="h-section mt-4 max-w-2xl">{tr("Real systems, running real businesses.")}</h2>
              </div>
              <Link to="/work" className="link-arrow">
                {tr("All case studies")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        >
          {caseStudies.map((study) => (
            <div key={study.slug} className="lg:w-[min(560px,42vw)] lg:shrink-0">
              <CaseCard study={study} />
            </div>
          ))}
        </HorizontalScroller>
      </section>

      {/* Why Oreece */}
      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <span className="eyebrow">{tr("Why Oreece")}</span>
            <h2 className="h-section mt-4">{tr("Enterprise discipline, without the enterprise overhead.")}</h2>
            <p className="lede mt-6">
              The engineering standards large organisations expect — security, documentation, audit trails — delivered
              by a team small enough to know your name.
            </p>
            <Link to="/trust" className="link-arrow mt-8">
              {tr("Our security practices")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7">
            {principles.map((p, i) => {
              const Icon = principleIcons[i];
              return (
                <Reveal key={p.title} delay={i * 90} className="border-t-2 border-[hsl(var(--ink))] pt-6">
                  <Icon className="h-6 w-6 text-[hsl(var(--brand-red))]" strokeWidth={1.6} />
                  <h3 className="mt-4 text-lg font-semibold">{tr(p.title)}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <div className="px-2">
        <section className="relative overflow-hidden rounded-2xl bg-[hsl(var(--ink))] py-20 text-white sm:py-28">
          <div className="grid-lines absolute inset-0" aria-hidden />
          <div className="wrap relative">
            <Reveal>
              <span className="eyebrow eyebrow-light">{tr("How we work")}</span>
              <h2 className="h-section mt-4 max-w-3xl">{tr("A predictable path from idea to impact.")}</h2>
            </Reveal>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {process.map((p, i) => (
                <Reveal key={p.step} delay={i * 120} className="bg-[hsl(var(--ink))]">
                  <li className="h-full p-8">
                    <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red-light))]">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-6 text-xl font-semibold">{tr(p.step)}</h3>
                    <p className="mt-3 leading-relaxed text-white/60">{p.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* Industries marquee */}
      <section className="overflow-hidden pt-16 sm:pt-20">
        <div className="wrap mb-8 flex items-end justify-between gap-6">
          <span className="eyebrow">{tr("Who we work with")}</span>
          <Link to="/industries" className="link-arrow">
            {tr("Industries")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex w-max marquee gap-4">
          {[...industries, ...industries].map((i, k) => (
            <Link
              key={k}
              to={`/industries#${i.slug}`}
              tabIndex={k >= industries.length ? -1 : undefined}
              className="whitespace-nowrap rounded-full border border-border px-7 py-3.5 font-display text-xl font-semibold text-[hsl(var(--ink)/0.75)] transition-colors hover:border-[hsl(var(--ink))] hover:text-[hsl(var(--ink))] sm:text-2xl"
            >
              {tr(i.name)}
            </Link>
          ))}
        </div>
      </section>

      {/* Technology */}
      <section className="py-16 sm:py-20">
        <div className="wrap border-y border-border py-10">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:col-span-3">{tr("Technologies we build with")}</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 lg:col-span-9">
              {technologies.map((t) => (
                <li key={t} className="font-display text-lg font-semibold text-[hsl(var(--ink)/0.6)]">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20 sm:pb-28">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="eyebrow">{tr("FAQ")}</span>
            <h2 className="h-section mt-4">{tr("Straight answers.")}</h2>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/trust" className="link-arrow">
                {tr("How we handle security")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/services#engage" className="link-arrow">
                {tr("Ways to engage")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <FaqList items={faqs.slice(0, 4)} />
          </div>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

function Chips({ slug, chip, items }: { slug: string; chip: string; items: string[] }) {
  const tr = useT();
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((c) => (
        <Link key={c} to={`/services#${slug}`} className={`chip ${chip}`}>
          {c}
        </Link>
      ))}
      <Link to={`/services#${slug}`} className={`chip ${chip}`}>
        {tr("+ More")}
      </Link>
    </div>
  );
}

export default Index;
