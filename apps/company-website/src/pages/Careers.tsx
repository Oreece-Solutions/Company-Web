import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Layout, PageHero, usePageMeta } from "../site/Layout";
import { company, jobs } from "../site/content";
import { useT } from "../site/i18n";

const perks = [
  "Real projects for real clients from week one",
  "Mentoring and feedback from our founder",
  "Flexible hours that fit around study",
  "Modern stack: React, TypeScript, Supabase, AI tooling",
];

const Careers = () => {
  const tr = useT();
  usePageMeta("Careers", "Join Oreece and help build websites, software and automation for businesses in New Zealand.");
  const open = jobs.filter((j) => j.open);

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Careers" }]}
        eyebrow={tr("Careers")}
        title={tr("Do the best work of your career, on work that matters.")}
        lede={tr("We are a small, growing company building systems that real businesses run on every day. If you care about craft, clarity and the people who use what you build, we would like to hear from you.")}
      />

      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">{tr("Why join us")}</span>
            <ul className="mt-6 space-y-4">
              {perks.map((p) => (
                <li key={p} className="border-b border-border pb-4 text-lg font-medium">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <span className="eyebrow">{tr("Open roles")}</span>
            <div className="mt-6 space-y-4">
              {open.length === 0 && <p className="text-muted-foreground">No open roles right now.</p>}
              {open.map((r) => (
                <Link
                  key={r.slug}
                  to={`/careers/${r.slug}`}
                  className="group block rounded-xl border border-border p-7 transition-colors hover:border-[hsl(var(--ink))]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{r.type}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{r.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{r.summary}</p>
                  <span className="link-arrow mt-5">
                    {tr("View role and apply")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground">
              Don’t see the right role? Send your CV and a short note to{" "}
              <a href={`mailto:${company.careersEmail}`} className="font-semibold text-[hsl(var(--ink))] underline underline-offset-4">
                {company.careersEmail}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Careers;
