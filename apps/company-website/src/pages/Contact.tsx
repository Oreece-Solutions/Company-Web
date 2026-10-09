import { useState } from "react";
import { Mail, Phone, Clock, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@company-web/shared/data-access";
import { Layout, PageHero, WhatsAppIcon, usePageMeta } from "../site/Layout";
import { company, services } from "../site/content";

const empty = { name: "", email: "", phone: "", company: "", project: "", budget: "", message: "" };

const budgets = ["Under $10k", "$10k – $25k", "$25k – $50k", "$50k – $100k", "$100k+", "Not sure yet"];

const field =
  "mt-2 block w-full rounded-md border border-input bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-[hsl(var(--ink))] focus:ring-2 focus:ring-[hsl(var(--ink)/0.08)]";

const Contact = () => {
  usePageMeta("Contact", "Talk to Oreece about custom software, AI automation or digital marketing for your New Zealand business.");

  const [form, setForm] = useState(empty);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { ...form, budget: form.budget && `${form.budget} NZD` },
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
        eyebrow="Contact"
        title="Let’s talk about what you are building."
        lede="Tell us a little about your business and what you want to achieve. A senior member of our team will reply within one business day."
      />

      <section className="py-20 sm:py-24">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <aside className="space-y-10 lg:col-span-4">
            <Info icon={Mail} title="Email">
              <a href={`mailto:${company.email}`} className="font-semibold text-[hsl(var(--ink))] hover:underline">
                {company.email}
              </a>
            </Info>
            <Info icon={Phone} title="Phone & WhatsApp">
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
                <WhatsAppIcon className="h-4 w-4" /> Message us on WhatsApp
              </a>
            </Info>
            <Info icon={Clock} title="Response time">
              Within one business day, Monday to Friday, NZ time.
            </Info>
            <Info icon={MapPin} title="Where we work">
              {company.regions.join(" · ")}
              <br />
              Meetings in person or on video, whichever suits you.
            </Info>
            <div className="rounded-xl bg-surface p-6">
              <p className="font-semibold">What happens next?</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>We read your message and reply with questions or ideas.</li>
                <li>A free 30-minute call to understand your goals.</li>
                <li>A written proposal with scope, timeline and fixed NZD price.</li>
              </ol>
            </div>
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            {state === "sent" ? (
              <div className="rounded-xl border border-border p-10 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[hsl(var(--pounamu))]" />
                <h2 className="mt-5 text-2xl font-semibold">Thanks — message received.</h2>
                <p className="mt-3 text-muted-foreground">We will be in touch within one business day.</p>
                <button className="btn-outline mt-8" onClick={() => setState("idle")}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
                <Field label="Your name" required>
                  <input name="name" value={form.name} onChange={set} required autoComplete="name" className={field} />
                </Field>
                <Field label="Work email" required>
                  <input type="email" name="email" value={form.email} onChange={set} required autoComplete="email" className={field} />
                </Field>
                <Field label="Company">
                  <input name="company" value={form.company} onChange={set} autoComplete="organization" className={field} />
                </Field>
                <Field label="Phone">
                  <input type="tel" name="phone" value={form.phone} onChange={set} autoComplete="tel" placeholder="+64" className={field} />
                </Field>
                <Field label="What can we help with?">
                  <select name="project" value={form.project} onChange={set} className={field}>
                    <option value="">Select…</option>
                    {services.map((s) => (
                      <option key={s.slug}>{s.title}</option>
                    ))}
                    <option>Something else</option>
                  </select>
                </Field>
                <Field label="Indicative budget (NZD)">
                  <select name="budget" value={form.budget} onChange={set} className={field}>
                    <option value="">Select…</option>
                    {budgets.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Tell us about your project" required>
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
                    Send message
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
  return (
    <label className="block text-sm font-semibold">
      {label}
      {required && <span className="text-[hsl(var(--brand-red))]"> *</span>}
      {children}
    </label>
  );
}

function Info({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--brand-red))]" strokeWidth={1.8} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <p className="mt-1.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export default Contact;
