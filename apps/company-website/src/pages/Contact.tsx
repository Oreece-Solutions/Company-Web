import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, Phone, Clock, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@company-web/shared/data-access";
import { Layout, PageHero, WhatsAppIcon, usePageMeta } from "../site/Layout";
import { company, services } from "../site/content";
import { useT } from "../site/i18n";

const empty = { name: "", email: "", phone: "", company: "", project: "", budget: "", timeline: "", message: "" };

const enquiryTypes = [
  { id: "project", label: "New project", prompt: "Tell us about your project" },
  { id: "rfp", label: "Request for proposal", prompt: "Summarise the RFP — scope, deadlines and how to receive the documents" },
  { id: "support", label: "Support for an existing system", prompt: "What system is it, and what do you need help with?" },
  { id: "other", label: "Partnership or other", prompt: "How can we help?" },
] as const;

type EnquiryType = (typeof enquiryTypes)[number]["id"];

const timelines = ["As soon as possible", "Within 3 months", "3–6 months", "Just exploring"];

const budgets = ["Under $10k", "$10k – $25k", "$25k – $50k", "$50k – $100k", "$100k+", "Not sure yet"];

const field =
  "mt-2 block w-full rounded-md border border-input bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-[hsl(var(--ink))] focus:ring-2 focus:ring-[hsl(var(--ink)/0.08)]";

const Contact = () => {
  const tr = useT();
  usePageMeta("Contact", "Talk to Oreece about custom software, AI automation or digital marketing for your business, wherever you are.");

  const [params] = useSearchParams();
  const initialType = enquiryTypes.find((t) => t.id === params.get("type"))?.id ?? "project";
  const [type, setType] = useState<EnquiryType>(initialType);
  const current = enquiryTypes.find((t) => t.id === type)!;
  const [form, setForm] = useState(empty);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      // The edge function only knows the original fields, so enquiry type and timeline travel in the message.
      const { timeline, ...rest } = form;
      const header = [`Enquiry type: ${current.label}`, timeline && `Timeline: ${timeline}`].filter(Boolean).join("\n");
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { ...rest, budget: form.budget && `${form.budget} NZD`, message: `${header}\n\n${form.message}` },
      });
      if (error) throw error;
      setState("sent");
      setForm(empty);
    } catch (err) {
      console.error("Error sending message:", err);
      setState("error");
    }
  };

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Contact" }]}
        eyebrow={tr("Contact")}
        title={tr("Let’s talk about what you are building.")}
        lede={tr("Tell us a little about your business and what you want to achieve. A senior member of our team will reply within one business day.")}
      />

      <section className="py-20 sm:py-24">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <aside className="space-y-10 lg:col-span-4">
            <Info icon={Mail} title={tr("Email")}>
              <a href={`mailto:${company.email}`} className="font-semibold text-[hsl(var(--ink))] hover:underline">
                {company.email}
              </a>
            </Info>
            <Info icon={Phone} title={tr("Phone & WhatsApp")}>
              <a href={company.phoneHref} className="font-semibold text-[hsl(var(--ink))] hover:underline">
                {company.phone}
              </a>
              <br />
              <a
                href={company.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5b]"
              >
                <WhatsAppIcon className="h-4 w-4" /> {tr("Message us on WhatsApp")}
              </a>
            </Info>
            <Info icon={Clock} title={tr("Response time")}>
              Within one business day, Monday to Friday, NZ time.
            </Info>
            <Info icon={MapPin} title={tr("Where we work")}>
              {company.regions.join(" · ")}
              <br />
              Meetings in person or on video, whichever suits you.
            </Info>
            <div className="rounded-xl bg-surface p-6">
              <p className="font-semibold">{tr("What happens next?")}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>We read your message and reply with questions or ideas.</li>
                <li>A free 30-minute call to understand your goals.</li>
                <li>A written proposal with scope, timeline and a fixed price.</li>
              </ol>
            </div>
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            {state === "sent" ? (
              <div className="rounded-xl border border-border p-10 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[hsl(var(--pounamu))]" />
                <h2 className="mt-5 text-2xl font-semibold">{tr("Thanks — message received.")}</h2>
                <p className="mt-3 text-muted-foreground">{tr("We will be in touch within one business day.")}</p>
                <button className="btn-outline mt-8" onClick={() => setState("idle")}>
                  {tr("Send another message")}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-semibold">{tr("What kind of enquiry is this?")}</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {enquiryTypes.map((t) => (
                      <label
                        key={t.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-[15px] font-medium transition-colors ${
                          type === t.id ? "border-[hsl(var(--ink))] bg-[hsl(var(--ink)/0.03)]" : "border-input hover:border-[hsl(var(--ink)/0.5)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="enquiryType"
                          value={t.id}
                          checked={type === t.id}
                          onChange={() => setType(t.id)}
                          className="accent-[hsl(var(--brand-red))]"
                        />
                        {tr(t.label)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label={tr("Your name")} required>
                  <input name="name" value={form.name} onChange={set} required autoComplete="name" className={field} />
                </Field>
                <Field label={tr("Work email")} required>
                  <input type="email" name="email" value={form.email} onChange={set} required autoComplete="email" className={field} />
                </Field>
                <Field label={tr("Company")}>
                  <input name="company" value={form.company} onChange={set} autoComplete="organization" className={field} />
                </Field>
                <Field label={tr("Phone")}>
                  <input type="tel" name="phone" value={form.phone} onChange={set} autoComplete="tel" placeholder="+64" className={field} />
                </Field>
                <Field label={tr("What can we help with?")}>
                  <select name="project" value={form.project} onChange={set} className={field}>
                    <option value="">{tr("Select…")}</option>
                    {services.map((s) => (
                      <option key={s.slug}>{tr(s.title)}</option>
                    ))}
                    <option>Something else</option>
                  </select>
                </Field>
                <Field label={tr("Indicative budget (NZD)")}>
                  <select name="budget" value={form.budget} onChange={set} className={field}>
                    <option value="">{tr("Select…")}</option>
                    {budgets.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <Field label={tr("Timeline")}>
                  <select name="timeline" value={form.timeline} onChange={set} className={field}>
                    <option value="">{tr("Select…")}</option>
                    {timelines.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label={tr(current.prompt)} required>
                    <textarea name="message" value={form.message} onChange={set} required rows={6} className={field} />
                  </Field>
                </div>
                {state === "error" && (
                  <p className="text-sm font-medium text-destructive sm:col-span-2" role="alert">
                    Something went wrong sending your message. Please try again, or email us at {company.email}.
                  </p>
                )}
                <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    We only use your details to respond to your enquiry, in line with the NZ Privacy Act 2020.
                  </p>
                  <button type="submit" disabled={state === "sending"} className="btn-primary shrink-0 disabled:opacity-60">
                    {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tr("Send message")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const tr = useT();
  return (
    <label className="block text-sm font-semibold">
      {tr(label)}
      {required && <span className="text-[hsl(var(--brand-red))]"> *</span>}
      {children}
    </label>
  );
}

function Info({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: React.ReactNode }) {
  const tr = useT();
  return (
    <div className="flex gap-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--brand-red))]" strokeWidth={1.8} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr(title)}</p>
        <p className="mt-1.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export default Contact;
