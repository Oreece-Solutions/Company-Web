import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { Layout, PageHero, usePageMeta } from "../site/Layout";
import { company, jobs } from "../site/content";
import { useT } from "../site/i18n";

// One open role: full description, how to apply, and Google JobPosting data
// so the role can appear in Google's job search.
const CareerDetail = () => {
  const tr = useT();
  const { slug } = useParams();
  const job = jobs.find((j) => j.slug === slug && j.open);
  usePageMeta(job ? `${job.title} (part-time, Auckland)` : "Careers", job?.summary ?? "");

  useEffect(() => {
    if (!job) return;
    const data = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: [...job.intro, "What you'll do: " + job.duties.join("; ") + "."].join(" "),
      datePosted: job.datePosted,
      validThrough: `${job.validThrough}T23:59:59+13:00`,
      employmentType: job.employmentType,
      hiringOrganization: { "@type": "Organization", name: "Oreece Limited", sameAs: "https://www.oreece.co.nz" },
      jobLocation: {
        "@type": "Place",
        address: { "@type": "PostalAddress", addressLocality: "Auckland", addressRegion: "Auckland", addressCountry: "NZ" },
      },
      ...(job.pay && {
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "NZD",
          value: { "@type": "QuantitativeValue", minValue: job.pay.min, maxValue: job.pay.max, unitText: job.pay.unit },
        },
      }),
      directApply: false,
    };
    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.dataset.job = job.slug;
    tag.textContent = JSON.stringify(data);
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [job]);

  if (!job) return <Navigate to="/careers" replace />;

  const subject = `${job.title} – Auckland`;
  const mailto = `mailto:${company.careersEmail}?subject=${encodeURIComponent(subject)}`;

  return (
    <Layout>
      <PageHero crumbs={[{ to: "/careers", label: "Careers" }, { label: job.title }]} eyebrow={job.type} title={job.title} lede={job.summary}>
        <a href={mailto} className="btn-primary mt-8 inline-flex items-center gap-2">
          <Mail className="h-4 w-4" /> {tr("Apply by email")}
        </a>
      </PageHero>

      <section className="py-16 sm:py-24">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <dl className="divide-y divide-border border-y border-border lg:sticky lg:top-28">
              {job.details.map((d) => (
                <div key={d.label} className="flex flex-col gap-1 py-4 text-sm">
                  <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr(d.label)}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
              <div className="py-5">
                <a href={mailto} className="btn-outline w-full">
                  <Mail className="h-4 w-4" /> {company.careersEmail}
                </a>
              </div>
            </dl>
          </aside>

          <div className="space-y-14 lg:col-span-7 lg:col-start-6">
            <div className="space-y-5 text-lg leading-relaxed">
              {job.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <Block title={tr("What you’ll do")} items={job.duties} />

            <div>
              <h2 className="text-2xl font-semibold">{tr("Who we’re looking for")}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We welcome students, recent graduates and emerging professionals studying or interested in:
              </p>
              <List items={job.studies} />
              <p className="mt-6 leading-relaxed text-muted-foreground">
                You don’t need to be an experienced salesperson. We value curiosity, clear communication, initiative and a
                willingness to learn. An understanding of websites, software, CRM platforms, AI tools or digital marketing is an advantage.
              </p>
            </div>

            <Block title={tr("What you’ll gain")} items={job.gains} />

            <div className="rounded-2xl border border-border p-8">
              <h2 className="text-2xl font-semibold">{tr("How to apply")}</h2>
              <p className="mt-4 leading-relaxed">
                Email <a href={mailto} className="font-semibold underline underline-offset-4">{company.careersEmail}</a> with the subject line{" "}
                <strong>{subject}</strong>. Include a short introduction: your technical interests, relevant studies or projects, and why
                you’d like to work with Oreece.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Applicants must have the legal right to do this work in New Zealand and meet any visa conditions. Student visa holders are
                welcome to apply within their visa’s work hours. We use your details only for this application and handle them in line
                with the NZ Privacy Act 2020.
              </p>
              <a href={mailto} className="btn-primary mt-6 inline-flex items-center gap-2">
                <Mail className="h-4 w-4" /> {tr("Apply by email")}
              </a>
            </div>

            <Link to="/careers" className="link-arrow">
              <ArrowLeft className="h-4 w-4" /> {tr("All open roles")}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <List items={items} />
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3 leading-relaxed">
          <Check className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--brand-red))]" aria-hidden />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

export default CareerDetail;
