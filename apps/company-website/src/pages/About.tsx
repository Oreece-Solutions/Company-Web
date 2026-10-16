import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { company, principles } from "../site/content";
import { useT } from "../site/i18n";
import { PartnerGrid } from "../site/Partners";

const values = [
  { word: "Manaakitanga", meaning: "Looking after people", body: "We treat your team, your customers and your data with care and respect." },
  { word: "Pono", meaning: "Being honest", body: "Straight answers on scope, cost and risk — including when the answer is “you don’t need us”." },
  { word: "Mahi tahi", meaning: "Working together", body: "We work alongside your people, not around them, and leave you more capable than we found you." },
];

const About = () => {
  const tr = useT();
  usePageMeta(
    "About",
    "Oreece is a New Zealand technology partner for businesses worldwide, combining one accountable lead with a dedicated delivery team.",
  );

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "About" }]}
        eyebrow={tr("About Oreece")}
        title={tr("A technology partner that stays accountable.")}
        lede={tr("Oreece helps businesses in New Zealand and around the world design, build and run the software, automation and marketing they need to compete — with the standards of a large consultancy and the attention of a small one.")}
      />

      <section className="py-20 sm:py-28">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">{tr("Our story")}</span>
            <h2 className="h-section mt-4">{tr("Built to close the gap between ambition and capability.")}</h2>
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-muted-foreground lg:col-span-7">
            <p>
              Too many growing businesses are stuck between generic software that almost fits and large agencies
              priced for corporates. Oreece exists to close that gap.
            </p>
            <p>
              We pair a dedicated lead — your single point of accountability — with a delivery team
              across {company.regions.join(" and ")}. That model lets us deliver enterprise-grade engineering at a
              price that makes sense for small and medium enterprises.
            </p>
            <p>
              Every engagement is scoped in plain language, priced up front and handed over with full documentation. You
              own the code, the data and the accounts — always.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface py-20 sm:py-28">
        <div className="wrap">
          <span className="eyebrow">{tr("What guides us")}</span>
          <h2 className="h-section mt-4 max-w-3xl">{tr("Values we can be held to.")}</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.word} delay={i * 80} className="bg-white p-8 sm:p-10">
                <p className="font-display text-3xl font-semibold">{v.word}</p>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--brand-red))]">{v.meaning}</p>
                <p className="mt-5 leading-relaxed text-muted-foreground">{v.body}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <div key={p.title} className="border-t-2 border-[hsl(var(--ink))] pt-5">
                <h3 className="font-semibold">{tr(p.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pt-20 sm:pt-28">
        <div className="wrap">
          <span className="eyebrow">{tr("Our partners")}</span>
          <h2 className="h-section mt-4 max-w-3xl">{tr("Businesses we are proud to work with.")}</h2>
          <div className="mt-12">
            <PartnerGrid />
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="wrap grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <img
              src="/Team/Nishan%20Gamage.png"
              alt="Nishan Gamage, Founder and CEO of Oreece"
              className="aspect-[4/5] w-full rounded-xl bg-surface object-cover"
              loading="lazy"
            />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <span className="eyebrow">{tr("Leadership")}</span>
            <h2 className="h-section mt-4">Nishan Gamage</h2>
            <p className="mt-2 font-semibold text-muted-foreground">{tr("Founder & CEO")}</p>
            <p className="lede mt-6">
              Nishan founded Oreece to help businesses scale and grow in the digital world. He leads client
              relationships and solution design, and personally oversees every engagement from first conversation to
              launch.
            </p>
            <Link to="/contact" className="link-arrow mt-8">
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

export default About;
