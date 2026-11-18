import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Layout, PageHero, Reveal, CtaBand, usePageMeta } from "../site/Layout";
import { FaqList } from "../site/Faq";
import { Countdown } from "../site/Promo";
import { ANNUAL_MONTHS, Plan, plans, pricingFaqs, sale, saleLive, SETUP_DISCOUNT } from "../site/pricing";
import { useT } from "../site/i18n";

type Billing = "monthly" | "annual";

const money = (n: number) => `$${n.toLocaleString("en-NZ", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
// Weekly equivalent shown as the headline price; billing stays monthly (or yearly).
const weekly = (perYear: number) =>
  `$${(perYear / 52).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Pricing = () => {
  const tr = useT();
  usePageMeta(
    "Website pricing",
    "Website plans for New Zealand small businesses from $13.62 a week + GST — design, hosting, SSL and maintenance included.",
  );
  const [billing, setBilling] = useState<Billing>("monthly");
  const live = saleLive();

  return (
    <Layout>
      <PageHero
        crumbs={[{ label: "Pricing" }]}
        eyebrow={tr("Website plans")}
        title={tr("A professional website from $13.62 a week + GST.")}
        lede={tr("Design, hosting, SSL and maintenance in one plan. No big upfront build cost — and you can move up a plan whenever you are ready.")}
      >
        {live && (
          <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--brand-red))] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]">
                <Sparkles className="h-3.5 w-3.5" /> {tr(sale.name)}
              </span>
              <p className="mt-3 text-xl font-semibold sm:text-2xl">{tr("50% off setup on Basic and Standard — save up to $124.50.")}</p>
              <p className="mt-1 text-sm text-white/60">{tr("Ends 11:59pm NZDT, Monday 30 November.")}</p>
            </div>
            <Countdown dark />
          </div>
        )}
      </PageHero>

      <section className="py-16 sm:py-24">
        <div className="wrap">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-white p-1" role="radiogroup" aria-label={tr("Billing period")}>
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={billing === b}
                  onClick={() => setBilling(b)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                    billing === b ? "bg-[hsl(var(--ink))] text-white" : "text-[hsl(var(--ink)/0.65)] hover:text-[hsl(var(--ink))]"
                  }`}
                >
                  {b === "monthly" ? tr("Monthly") : tr("Annual")}
                  {b === "annual" && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${billing === b ? "bg-white/15" : "bg-[hsl(var(--pounamu)/0.12)] text-[hsl(var(--pounamu))]"}`}>
                      {tr("2 months free")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {plans.map((p, i) => (
              <Reveal key={p.id} delay={i * 90} className="h-full">
                <PlanCard plan={p} billing={billing} saleOn={live} />
              </Reveal>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {tr("All prices are in NZD and exclude GST. Plans are paid monthly, or yearly on annual billing.")} {live && tr(sale.terms)}
          </p>
        </div>
      </section>

      <section className="border-t border-border py-20 sm:py-28">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="eyebrow">{tr("FAQ")}</span>
            <h2 className="h-section mt-4">{tr("Pricing questions.")}</h2>
            <p className="lede mt-5">{tr("Need something not listed here? Ask us — we answer honestly.")}</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <FaqList items={pricingFaqs} />
          </div>
        </div>
      </section>

      <CtaBand />
    </Layout>
  );
};

function PlanCard({ plan, billing, saleOn }: { plan: Plan; billing: Billing; saleOn: boolean }) {
  const tr = useT();
  const pop = plan.popular;
  const annual = billing === "annual";
  const setupHalf = saleOn && plan.setup !== null;

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-7 sm:p-8 ${
        pop
          ? "border-[hsl(var(--ink))] bg-[hsl(var(--ink))] text-white shadow-[0_30px_60px_-25px_hsl(222_47%_7%/0.55)] lg:-my-4 lg:py-12"
          : "border-border bg-white"
      }`}
    >
      {pop && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[hsl(var(--brand-red))] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white">
          {tr("Most popular")}
        </span>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold">{tr(plan.name)}</h2>
        {!pop && <span className="text-sm font-medium text-muted-foreground">{tr(plan.tag)}</span>}
      </div>
      <p className={`mt-2 ${pop ? "text-white/65" : "text-muted-foreground"}`}>{tr(plan.blurb)}</p>

      <div className="mt-7 min-h-[96px]">
        {plan.monthly !== null ? (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-5xl font-semibold tracking-tight">
                {weekly(plan.monthly * (annual ? ANNUAL_MONTHS : 12))}
              </span>
              <span className={pop ? "text-white/60" : "text-muted-foreground"}>/ {tr("week")}</span>
            </p>
            <p className={`mt-1 text-sm ${pop ? "text-white/60" : "text-muted-foreground"}`}>
              {tr("+ GST")} · {annual ? tr("paid yearly · 2 months free") : tr("paid monthly")}
            </p>
            <p className="mt-2 text-sm">
              {tr("One-time setup:")}{" "}
              {setupHalf ? (
                <>
                  <s className={pop ? "text-white/45" : "text-muted-foreground"}>{money(plan.setup!)}</s>{" "}
                  <strong className={pop ? "text-[hsl(var(--brand-red-light))]" : "text-[hsl(var(--brand-red))]"}>{money(plan.setup! * SETUP_DISCOUNT)} · {tr("50% off")}</strong>
                </>
              ) : (
                <strong>{money(plan.setup!)}</strong>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className={pop ? "text-white/60" : "text-muted-foreground"}>{tr("From")}</span>
              <span className="font-display text-5xl font-semibold tracking-tight">{weekly(plan.fromPrice! * 12)}</span>
              <span className="text-muted-foreground">/ {tr("week")}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("+ GST")} · {tr("paid monthly")}
            </p>
            <p className="mt-2 text-sm">{tr("Setup quoted after a free discovery call.")}</p>
          </>
        )}
      </div>

      <Link
        to={`/contact?plan=${plan.id}`}
        className={`mt-7 w-full justify-center ${pop ? "btn-primary" : plan.monthly === null ? "btn-dark" : "btn-outline"}`}
      >
        {tr(plan.cta)} <ArrowRight className="h-4 w-4" />
      </Link>

      <ul className={`mt-8 space-y-3 border-t pt-7 text-[15px] ${pop ? "border-white/10" : "border-border"}`}>
        {plan.features.map((f) => (
          <li key={f} className="flex gap-3">
            <Check className={`mt-0.5 h-5 w-5 shrink-0 ${pop ? "text-[hsl(var(--brand-red-light))]" : "text-[hsl(var(--pounamu))]"}`} />
            {tr(f)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Pricing;
