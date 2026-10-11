import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { company, trustPractices } from "../site/content";
import { useT } from "../site/i18n";

const commitments = [
  { title: "Before we start", body: "We agree who needs access, where data will be hosted and what personal information the system will hold." },
  { title: "While we build", body: "Separate development, staging and production environments, with secrets kept out of code and access logged." },
  { title: "When we hand over", body: "Documentation, credentials and admin rights transfer to you, and our access is reduced or removed as agreed." },
];

const Trust = () => {
  const tr = useT();
  usePageMeta(
    "Trust & security",
    "How Oreece protects client systems and data: least-privilege access, audit trails, privacy by design under the NZ Privacy Act 2020, and client-owned accounts.",
  );

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Trust & security" }]}
        eyebrow={tr("Trust & security")}
        title={tr("Security is part of the build, not an add-on.")}
        lede={tr("The practices we follow on every engagement, so your IT, risk and procurement teams know exactly what to expect.")}
      />

      <section className="py-20 sm:py-28">
        <div className="wrap">
          <span className="eyebrow">{tr("Our practices")}</span>
          <h2 className="h-section mt-4 max-w-3xl">{tr("What we do on every project.")}</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {trustPractices.map((p, i) => (
              <Reveal key={p.title} delay={(i % 3) * 80} className="bg-white p-8">
                <ShieldCheck className="h-6 w-6 text-[hsl(var(--brand-red))]" strokeWidth={1.6} />
                <h3 className="mt-5 text-lg font-semibold">{tr(p.title)}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="px-2">
        <section className="relative overflow-hidden rounded-2xl bg-[hsl(var(--ink))] py-20 text-white sm:py-28">
          <div className="grid-lines absolute inset-0" aria-hidden />
          <div className="wrap relative">
            <span className="eyebrow eyebrow-light">{tr("Engagement lifecycle")}</span>
            <h2 className="h-section mt-4 max-w-3xl">{tr("Clear rules from kickoff to handover.")}</h2>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-3">
              {commitments.map((c, i) => (
                <li key={c.title} className="bg-[hsl(var(--ink))] p-8">
                  <span className="font-display text-sm font-semibold text-[hsl(var(--brand-red-light))]">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-5 text-xl font-semibold">{c.title}</h3>
                  <p className="mt-3 leading-relaxed text-white/60">{c.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">{tr("Due diligence")}</span>
            <h2 className="h-section mt-4">{tr("Completing a vendor questionnaire?")}</h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="lede">
              We are happy to complete your security or supplier questionnaire, walk your IT team through our approach,
              or agree specific controls in the contract.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact?type=rfp" className="btn-primary">
                Send us your questionnaire <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/privacy" className="btn-outline">Read our privacy statement</Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Report a security concern: <a href={`mailto:${company.email}`} className="font-semibold text-[hsl(var(--ink))] hover:underline">{company.email}</a>
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

export default Trust;
