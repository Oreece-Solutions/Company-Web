// Single source of truth for public site copy. Only real work and verifiable
// claims belong here — no invented clients, metrics or testimonials.

export const company = {
  name: "Oreece",
  legalName: "Oreece Business Solutions",
  email: "hello@oreece.com",
  careersEmail: "careers@oreece.com",
  regions: ["Aotearoa New Zealand", "Sri Lanka"],
};

export type ServiceSlug = "software" | "ai" | "marketing";

export const services: {
  slug: ServiceSlug;
  eyebrow: string;
  title: string;
  summary: string;
  outcomes: string[];
  capabilities: string[];
}[] = [
  {
    slug: "software",
    eyebrow: "01",
    title: "Custom software & platforms",
    summary:
      "Business systems built around how your team actually works — from customer-facing web apps to the operational platforms that run your back office.",
    outcomes: [
      "Replace spreadsheets and paper forms with one system of record",
      "Give staff fast, mobile-friendly tools on the shop floor or in the field",
      "Own your code, your data and your roadmap",
    ],
    capabilities: [
      "Web & mobile applications",
      "Internal platforms, CRMs & portals",
      "Workflow, inventory & operations systems",
      "Integrations with Xero, payment and booking tools",
      "Cloud architecture on Supabase, Vercel & AWS",
      "Support, maintenance & continuous improvement",
    ],
  },
  {
    slug: "ai",
    eyebrow: "02",
    title: "AI & automation",
    summary:
      "Practical AI that removes manual work — agents, automations and data pipelines with a human approval step wherever it matters.",
    outcomes: [
      "Hours of repetitive admin handed to reliable workflows",
      "AI drafts, people approve — nothing goes out unchecked",
      "Clear audit trails for every automated decision",
    ],
    capabilities: [
      "AI agents & assistants on Claude and leading models",
      "Workflow automation with n8n",
      "Document, email & data extraction",
      "Lead capture, routing & follow-up automation",
      "Reporting & analytics pipelines",
      "Privacy-first design aligned to the NZ Privacy Act 2020",
    ],
  },
  {
    slug: "marketing",
    eyebrow: "03",
    title: "Digital marketing & growth",
    summary:
      "Websites and campaigns that turn local search and social attention into enquiries — measured, accountable and built to rank in New Zealand.",
    outcomes: [
      "Be found by customers searching in your region",
      "Turn website traffic into qualified enquiries",
      "Know what is working, every month, in plain language",
    ],
    capabilities: [
      "Conversion-focused websites",
      "Local SEO & Google Business Profile",
      "Social media content & scheduling",
      "Paid search & social campaigns",
      "Analytics, tracking & reporting",
      "Brand identity & content design",
    ],
  },
];

export type CaseStudy = {
  slug: string;
  client: string;
  sector: string;
  location: string;
  title: string;
  summary: string;
  challenge: string;
  solution: string[];
  stack: string[];
  services: ServiceSlug[];
  url?: string;
  status: string;
  tone: "ink" | "red" | "pounamu" | "sand";
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "jcp-car-parts",
    client: "JCP Car Parts",
    sector: "Automotive · Dismantling",
    location: "New Zealand",
    title: "A barcode-driven operations platform for a vehicle dismantler",
    summary:
      "From vehicle intake to sellable stock, every part is tracked through stripping, photography, QC and put-away — on phones on the floor and dashboards in the office.",
    challenge:
      "Parts moved between strip, store and sales teams on paper forms, with no reliable picture of what was in stock, where it was, or who handled it.",
    solution: [
      "End-to-end workflow: intake → strip → handover → photo → QC → put-away → final QA",
      "Mobile floor app with camera and handheld-scanner barcode support that keeps working offline",
      "Store team management: zones, work queues, stock counts and picking",
      "Business rules enforced in the database with a complete audit trail",
    ],
    stack: ["Next.js", "Supabase", "PostgreSQL", "PWA"],
    services: ["software"],
    status: "Platform delivered · rollout in progress",
    tone: "ink",
  },
  {
    slug: "rusteze-auto-spa",
    client: "Rusteze Auto Spa",
    sector: "Automotive · Detailing",
    location: "Auckland",
    title: "A bilingual website and CMS for an Auckland detailing studio",
    summary:
      "A fast, search-optimised website in English and te reo Māori, with a private admin portal for enquiries, bookings, services, gallery, blog and reviews.",
    challenge:
      "The studio needed a premium online presence that ranked locally and let the team manage content and enquiries without a developer.",
    solution: [
      "Server-rendered site built for speed and local SEO, with structured data",
      "English and te reo Māori language support",
      "Admin portal for enquiries, bookings, customers, services, gallery and blog",
      "Interactive before/after comparisons and quote forms with spam protection",
    ],
    stack: ["React", "TanStack Start", "Supabase", "Tailwind CSS"],
    services: ["software", "marketing"],
    status: "Delivered",
    tone: "red",
  },
  {
    slug: "lucky-ceylon-tours",
    client: "Lucky Ceylon Tours",
    sector: "Tourism · Travel",
    location: "Sri Lanka",
    title: "A tour booking website that turns browsers into enquiries",
    summary:
      "A tourism website where travellers explore destinations, shortlist favourites into a personal itinerary and send a tailored enquiry in a few clicks.",
    challenge:
      "International travellers needed to understand the offer quickly and trust an operator they had never met before reaching out.",
    solution: [
      "Destination explorer with build-your-own itinerary",
      "Tour package catalogue",
      "Structured enquiry flow that captures travel dates and preferences",
      "SEO-ready pages for international search",
    ],
    stack: ["Next.js", "React"],
    services: ["software", "marketing"],
    url: "https://luckyceylontour.com",
    status: "Live",
    tone: "sand",
  },
  {
    slug: "oreece-social-os",
    client: "Oreece Social OS",
    sector: "AI · Marketing automation",
    location: "New Zealand",
    title: "An AI social media operating system with human approval built in",
    summary:
      "Research, ideas, copy, quality checks, approval, scheduling, publishing and analytics — orchestrated by AI agents, with a person approving every post.",
    challenge:
      "Consistent, high-quality social content takes hours each week, and fully automated posting is too risky for a brand.",
    solution: [
      "AI pipeline from research and briefs to platform-specific copy",
      "Automated quality control before anything reaches a human",
      "One-tap approval via Telegram, then scheduled publishing",
      "Analytics, comment and lead tracking feeding a learning loop",
    ],
    stack: ["n8n", "Claude", "Supabase", "PostgreSQL"],
    services: ["ai", "marketing"],
    status: "Built and verified end to end · launching 2026",
    tone: "pounamu",
  },
];

export const principles = [
  {
    title: "Local accountability",
    body: "A New Zealand point of contact who knows your business, works your hours and answers the phone.",
  },
  {
    title: "Fixed scope, clear pricing",
    body: "Proposals in NZD with scope, milestones and price agreed up front. No surprise invoices.",
  },
  {
    title: "You own everything",
    body: "Your code, your data, your accounts. Full handover documentation, no lock-in.",
  },
  {
    title: "Secure by default",
    body: "Least-privilege access, audit trails and privacy built in from day one — not bolted on.",
  },
];

export const process = [
  {
    step: "Discover",
    body: "We map your workflows, goals and constraints, then agree a scoped proposal with a fixed price.",
  },
  {
    step: "Design",
    body: "Clickable prototypes you can test with your team before a line of production code is written.",
  },
  {
    step: "Build",
    body: "Short delivery cycles with a working demo every fortnight, so you always know where things stand.",
  },
  {
    step: "Run & improve",
    body: "Launch support, monitoring and a roadmap for what comes next — at a pace that suits you.",
  },
];

export const industries = [
  "Automotive",
  "Tourism & hospitality",
  "Trades & field services",
  "Professional services",
  "Retail & e-commerce",
  "Not-for-profit",
];
