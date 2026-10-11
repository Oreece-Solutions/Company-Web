import { Layout, PageHero, usePageMeta } from "../site/Layout";
import { company } from "../site/content";
import { useT } from "../site/i18n";

// DRAFT — review with a legal adviser before launch.
const sections = [
  {
    h: "Who we are",
    p: [`${company.legalName} ("Oreece", "we") provides software, automation and digital marketing services. This statement explains how we handle personal information collected through this website and our services, in line with the Privacy Act 2020.`],
  },
  {
    h: "What we collect",
    p: [
      "When you contact us we collect the details you provide, such as your name, email, phone number, company and the content of your message.",
      "We may also collect basic technical information about how the site is used, such as pages visited and browser type.",
    ],
  },
  {
    h: "How we use it",
    p: ["We use your information to respond to your enquiry, provide and improve our services, and keep records of our dealings with you. We do not sell personal information."],
  },
  {
    h: "Who we share it with",
    p: [
      "We use trusted service providers to host our website, store enquiries and send email. Some of these providers store information outside New Zealand. When that happens we take reasonable steps to ensure the information is protected in a way comparable to the Privacy Act 2020.",
    ],
  },
  {
    h: "How we protect it",
    p: ["Access to personal information is limited to the people who need it, and we use reasonable security safeguards to protect it from loss, misuse and unauthorised access."],
  },
  {
    h: "Your rights",
    p: [`You can ask to access or correct the personal information we hold about you by emailing ${company.email}. If you are not satisfied with our response, you can contact the Office of the Privacy Commissioner at privacy.org.nz.`],
  },
];

const Privacy = () => {
  const tr = useT();
  usePageMeta("Privacy", "How Oreece collects, uses and protects personal information under the New Zealand Privacy Act 2020.");

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Privacy" }]}
        eyebrow={tr("Privacy statement")}
        title={tr("How we handle your information.")}
        lede={tr("Plain-language detail on what we collect, why, and the choices you have.")}
      />
      <section className="py-16 sm:py-24">
        <div className="wrap max-w-3xl">
          {sections.map((s) => (
            <div key={s.h} className="border-t border-border py-8">
              <h2 className="text-xl font-semibold">{s.h}</h2>
              {s.p.map((t) => (
                <p key={t} className="mt-3 leading-relaxed text-muted-foreground">{t}</p>
              ))}
            </div>
          ))}
          <p className="border-t border-border pt-8 text-sm text-muted-foreground">
            Questions about privacy: <a href={`mailto:${company.email}`} className="font-semibold text-[hsl(var(--ink))] hover:underline">{company.email}</a>
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
