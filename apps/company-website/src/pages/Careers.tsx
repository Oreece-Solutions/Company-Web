import { ArrowRight } from "lucide-react";
import { Layout, PageHero, usePageMeta } from "../site/Layout";
import { company } from "../site/content";

const roles = [
  {
    title: "Software Engineering Intern",
    type: "Internship · Flexible",
    body: "Work on real client projects across React, TypeScript and Supabase, with mentorship from senior developers and the potential for a full-time offer.",
  },
];

const perks = [
  "Real projects for real clients from week one",
  "Mentorship and code review from senior engineers",
  "Flexible working hours",
  "Modern stack: React, TypeScript, Supabase, AI tooling",
];

const Careers = () => {
  usePageMeta("Careers", "Join Oreece and build software, automation and AI for New Zealand businesses.");

  return (
    <Layout>
      <PageHero
        eyebrow="Careers"
        title="Do the best work of your career, on work that matters."
        lede="We are a small team building systems that real businesses run on every day. If you care about craft, clarity and the people who use what you build, we would like to hear from you."
      />

      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">Why join us</span>
            <ul className="mt-6 space-y-4">
              {perks.map((p) => (
                <li key={p} className="border-b border-border pb-4 text-lg font-medium">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <span className="eyebrow">Open roles</span>
            <div className="mt-6 space-y-4">
              {roles.map((r) => (
                <a
                  key={r.title}
                  href={`mailto:${company.careersEmail}?subject=${encodeURIComponent(`Application: ${r.title}`)}`}
                  className="group block rounded-xl border border-border p-7 transition-colors hover:border-[hsl(var(--ink))]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{r.type}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{r.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{r.body}</p>
                  <span className="link-arrow mt-5">
                    Apply by email <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
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
