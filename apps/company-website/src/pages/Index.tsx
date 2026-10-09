import { Link } from "react-router-dom";
import { ArrowRight, Bot, Code2, LineChart, ShieldCheck, MapPin, FileCheck2, KeyRound } from "lucide-react";
import { Layout, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { CaseCard } from "../site/CaseCard";
import { caseStudies, industries, principles, process, services } from "../site/content";

const serviceIcons = { software: Code2, ai: Bot, marketing: LineChart };
const principleIcons = [MapPin, FileCheck2, KeyRound, ShieldCheck];

const Index = () => {
  usePageMeta(
    "Oreece",
    "Oreece builds custom software, AI automation and digital marketing for New Zealand businesses. Local accountability, fixed-scope proposals and code you own.",
  );

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--ink))] text-white">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-[hsl(var(--brand-red)/0.22)] blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-[hsl(var(--pounamu)/0.35)] blur-3xl" aria-hidden />
        <div className="wrap relative grid gap-14 pb-16 pt-20 sm:pt-28 lg:grid-cols-12 lg:pt-32">
          <div className="lg:col-span-8">
            <span className="eyebrow eyebrow-light">Kia ora — technology partner for NZ business</span>
            <h1 className="h-display mt-6">
              Software, AI and growth,{" "}
              <span className="text-[hsl(var(--brand-red-light))]">built for how New Zealand works.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
              We design and build the systems, automations and websites that help Kiwi businesses run leaner and
              grow faster — with local accountability, fixed-scope pricing and code you own.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/contact" className="btn-primary">
                Book a free consultation <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/work" className="btn-outline-light">
                See our work
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:col-span-4 lg:block" aria-hidden>
            <div className="absolute -left-10 top-6 w-[130%] rotate-[-4deg] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10">
              <img src="/work/lucky-ceylon.jpg" alt="" className="block w-full" />
            </div>
            <div className="absolute left-4 top-48 w-[130%] rotate-[3deg] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10">
              <img src="/work/rusteze.jpg" alt="" className="block w-full" />
            </div>
          </div>
        </div>
        <div className="wrap relative pb-16">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 text-sm md:grid-cols-4">
            {[
              ["NZ", "based contact & hours"],
              ["NZD", "fixed-scope proposals"],
              ["100%", "code & data ownership"],
              ["1 day", "response to enquiries"],
            ].map(([k, v]) => (
              <div key={v} className="bg-[hsl(var(--ink)/0.85)] p-5 backdrop-blur">
                <dt className="font-display text-2xl font-semibold text-white">{k}</dt>
                <dd className="mt-1 text-white/55">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 sm:py-28">
        <div className="wrap">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <span className="eyebrow">What we do</span>
              <h2 className="h-section mt-4">Three capabilities. One accountable team.</h2>
            </div>
            <p className="lede lg:col-span-5">
              Most businesses do not need ten vendors. They need one partner who can build the system, automate
              the busywork and bring in the customers.
            </p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {services.map((s, i) => {
              const Icon = serviceIcons[s.slug];
              return (
                <Reveal key={s.slug} delay={i * 80} className="bg-white">
                  <Link to={`/services#${s.slug}`} className="group flex h-full flex-col p-8 transition-colors hover:bg-surface sm:p-10">
                    <div className="flex items-center justify-between">
                      <Icon className="h-7 w-7 text-[hsl(var(--brand-red))]" strokeWidth={1.6} />
                      <span className="font-display text-sm font-semibold text-muted-foreground">{s.eyebrow}</span>
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold">{s.title}</h3>
                    <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">{s.summary}</p>
                    <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm">
                      {s.capabilities.slice(0, 4).map((c) => (
                        <li key={c} className="flex gap-2.5">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--brand-red))]" />
                          {c}
                        </li>
                      ))}
                    </ul>
                    <span className="link-arrow mt-8">
                      Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected work */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="wrap">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Selected work</span>
              <h2 className="h-section mt-4 max-w-2xl">Real systems, running real businesses.</h2>
            </div>
            <Link to="/work" className="link-arrow">
              All case studies <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-2">
            {caseStudies.map((study, i) => (
              <Reveal key={study.slug} delay={(i % 2) * 100}>
                <CaseCard study={study} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why Oreece */}
      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">Why Oreece</span>
            <h2 className="h-section mt-4">Enterprise discipline, without the enterprise overhead.</h2>
            <p className="lede mt-6">
              You get the engineering standards large organisations expect — security, documentation, audit trails
              — delivered by a team small enough to know your name.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7">
            {principles.map((p, i) => {
              const Icon = principleIcons[i];
              return (
                <Reveal key={p.title} delay={i * 60} className="border-t-2 border-[hsl(var(--ink))] pt-6">
                  <Icon className="h-6 w-6 text-[hsl(var(--brand-red))]" strokeWidth={1.6} />
                  <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-[hsl(var(--ink))] py-20 text-white sm:py-28">
        <div className="wrap">
          <span className="eyebrow eyebrow-light">How we work</span>
          <h2 className="h-section mt-4 max-w-3xl">A predictable path from idea to impact.</h2>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <li key={p.step} className="bg-[hsl(var(--ink))] p-8">
                <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red-light))]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-xl font-semibold">{p.step}</h3>
                <p className="mt-3 leading-relaxed text-white/60">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Industries */}
      <section className="py-20 sm:py-24">
        <div className="wrap grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <span className="eyebrow">Who we work with</span>
            <h2 className="h-section mt-4">Built for the backbone of the NZ economy.</h2>
            <p className="lede mt-5">
              Small and medium enterprises that have outgrown off-the-shelf tools — and organisations ready to put AI
              to work responsibly.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3 lg:col-span-7 lg:justify-end">
            {industries.map((i) => (
              <li key={i} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium">
                {i}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

export default Index;
