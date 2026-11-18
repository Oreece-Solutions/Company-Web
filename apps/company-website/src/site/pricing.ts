// Website plans and the Black Friday offer. Prices are NZD, excluding GST.
// The sale switches itself off at `sale.endsAt` — no code change needed afterwards.

export const sale = {
  name: "Black Friday",
  // Cyber Monday, end of day, New Zealand daylight time.
  endsAt: new Date("2026-11-30T23:59:59+13:00"),
  headline: "Black Friday: 50% off setup on website plans",
  terms: "50% off the one-time setup fee on Basic and Standard plans for sign-ups confirmed by 11:59pm NZDT, Monday 30 November 2026. Monthly or annual billing as chosen.",
};

export const saleLive = (now = new Date()) => now < sale.endsAt;

// Setup price multiplier during the sale (0.5 = 50% off).
export const SETUP_DISCOUNT = 0.5;

export type Plan = {
  id: "basic" | "standard" | "custom";
  name: string;
  tag: string;
  monthly: number | null; // null = quoted
  fromPrice?: number; // "From $X / month" for custom
  setup: number | null;
  blurb: string;
  features: string[];
  popular?: boolean;
  cta: string;
};

export const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    tag: "Small businesses",
    monthly: 59,
    setup: 149,
    blurb: "A simple, professional online presence.",
    features: [
      "One-page responsive website",
      "About, services and contact sections",
      "Contact / enquiry form",
      "Mobile-friendly design",
      "Basic SEO setup",
      "Hosting and SSL",
      "Technical maintenance",
    ],
    cta: "Start with Basic",
  },
  {
    id: "standard",
    name: "Standard",
    tag: "Most popular",
    monthly: 99,
    setup: 249,
    popular: true,
    blurb: "Everything a growing small business needs.",
    features: [
      "Up to 5 website pages",
      "Customised professional design",
      "Individual service pages",
      "Contact and quote request forms",
      "Google Maps integration",
      "Basic on-page SEO",
      "Google Analytics integration",
      "Hosting, SSL and backups",
      "Basic monthly content updates",
    ],
    cta: "Choose Standard",
  },
  {
    id: "custom",
    name: "Custom",
    tag: "Bigger ambitions",
    monthly: null,
    fromPrice: 199,
    setup: null,
    blurb: "A website built around how your business actually works.",
    features: [
      "Everything in Standard",
      "Unlimited pages",
      "Online booking or e-commerce",
      "Custom features and integrations (CRM, payments, inventory)",
      "Advanced SEO with a monthly report",
      "Priority support",
      "Daily backups",
      "More monthly content update time",
    ],
    cta: "Get a quote",
  },
];

// Annual billing: pay for 10 months, get 12.
export const ANNUAL_MONTHS = 10;

export const pricingFaqs = [
  {
    q: "Are prices in NZD and do they include GST?",
    a: "All prices are in New Zealand dollars and exclude GST where applicable.",
  },
  {
    q: "What does the one-time setup fee cover?",
    a: "Design, building your site, loading your content, connecting your domain and going live. During the Black Friday offer the setup fee on Basic and Standard is 50% off.",
  },
  {
    q: "Can I move to a bigger plan later?",
    a: "Yes. Start on Basic and move up to Standard or Custom when you need more pages or features — we carry your site across.",
  },
  {
    q: "What is the difference between monthly and annual billing?",
    a: "Same plan, same features. Annual billing is paid up front for the year and costs the same as 10 months — two months free.",
  },
];
