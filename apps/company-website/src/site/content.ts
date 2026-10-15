// Single source of truth for public site copy. Only real work and verifiable
// claims belong here — no invented clients, metrics or testimonials.

export const company = {
  name: "Oreece",
  legalName: "Oreece Business Solutions",
  email: "hello@oreece.com",
  careersEmail: "careers@oreece.com",
  phone: "+64 22 354 1659",
  phoneHref: "tel:+64223541659",
  whatsapp: "https://wa.me/64223541659?text=" + encodeURIComponent("Kia ora Oreece, I'd like to talk about a project."),
  regions: ["Aotearoa New Zealand", "Sri Lanka"],
};

// Add the profile URL to show an icon in the footer; empty entries are hidden.
export const socials: { name: "Facebook" | "LinkedIn" | "TikTok" | "Instagram"; url: string }[] = [
  { name: "LinkedIn", url: "https://www.linkedin.com/company/oreece" },
  { name: "Facebook", url: "https://www.facebook.com/oreecesolutions" },
  { name: "TikTok", url: "https://www.tiktok.com/@oreece.limited" },
  { name: "Instagram", url: "https://www.instagram.com/oreece.limited" },
];

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
  industry: IndustrySlug;
  url?: string;
  image?: string;
  status: string;
  tone: "ink" | "red" | "pounamu" | "sand";
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "jcp-car-parts",
    client: "JCP Car Parts",
    sector: "Automotive · Dismantling",
    location: "Auckland",
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
    industry: "automotive",
    url: "https://jcpcarparts.co.nz",
    image: "/work/jcp.jpg",
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
    industry: "automotive",
    url: "https://rustezeautospa.co.nz",
    image: "/work/rusteze.jpg",
    status: "Live",
    tone: "red",
  },
  {
    slug: "pristine-pro-moving",
    client: "Pristine Pro Moving",
    sector: "Moving · Removals",
    location: "Auckland",
    title: "A quote-first website and operations platform for an Auckland moving company",
    summary:
      "A fast, local-SEO website that turns visitors into quote requests, backed by an admin platform for leads, quotes, bookings, jobs, staff and vehicles.",
    challenge:
      "A new moving business needed to earn trust online from day one and run quoting, bookings and jobs from one place as it grows from a single operator to a multi-vehicle team.",
    solution: [
      "Quote-first website with a quick-quote bar, service and service-area pages, and click-to-call and WhatsApp throughout",
      "CRM with a lead pipeline, follow-ups, line-item quotes and quote-to-booking conversion",
      "Booking calendar, job checklists, and staff and vehicle assignment with double-booking warnings",
      "Review workflow, analytics dashboards, a lightweight CMS and spam-protected forms",
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Tailwind CSS"],
    services: ["software", "marketing"],
    industry: "trades",
    url: "https://www.pristinemovers.co.nz",
    image: "/work/pristine.jpg",
    status: "Website live · operations platform built",
    tone: "pounamu",
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
    industry: "tourism",
    url: "https://luckyceylontour.com",
    image: "/work/lucky-ceylon.jpg",
    status: "Live",
    tone: "sand",
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

export type IndustrySlug = "automotive" | "tourism" | "trades" | "professional" | "retail" | "nfp";

// Only automotive, tourism and trades have delivered case studies; the rest describe what we build, not past clients.
export const industries: { slug: IndustrySlug; name: string; summary: string; builds: string[] }[] = [
  {
    slug: "automotive",
    name: "Automotive",
    summary: "Dismantlers, workshops and detailers running stock, jobs and bookings across the floor and the office.",
    builds: ["Barcode inventory & parts tracking", "Workshop job and booking systems", "Quote and enquiry websites that rank locally"],
  },
  {
    slug: "tourism",
    name: "Tourism & hospitality",
    summary: "Operators who need international travellers to trust them and enquire before they have ever met.",
    builds: ["Tour catalogues & itinerary builders", "Booking and enquiry flows", "Multilingual, SEO-ready websites"],
  },
  {
    slug: "trades",
    name: "Trades & field services",
    summary: "Teams quoting, scheduling and invoicing from vans and job sites rather than desks.",
    builds: ["Mobile job sheets & photo capture", "Scheduling and dispatch", "Quote-to-invoice workflows with Xero"],
  },
  {
    slug: "professional",
    name: "Professional services",
    summary: "Firms where client intake, documents and follow-up eat into billable time.",
    builds: ["Client portals & CRMs", "Document and email automation with AI", "Lead capture and follow-up workflows"],
  },
  {
    slug: "retail",
    name: "Retail & e-commerce",
    summary: "Retailers joining up online stores, stock and marketing so every channel tells the same story.",
    builds: ["Online stores & product catalogues", "Stock and order integrations", "Paid social and search campaigns"],
  },
  {
    slug: "nfp",
    name: "Not-for-profit",
    summary: "Organisations doing more with small teams and accountable budgets.",
    builds: ["Donor and volunteer management", "Reporting automation for funders", "Accessible, low-maintenance websites"],
  },
];

export const engagements = [
  {
    title: "Discovery sprint",
    fit: "Best when the problem is clear but the solution is not",
    body: "Two weeks to map the problem, prototype the solution and price the build — with no commitment beyond it.",
    includes: ["Stakeholder workshops", "Clickable prototype", "Fixed-price build proposal"],
  },
  {
    title: "Fixed-scope project",
    fit: "Best for new systems, websites and automations",
    body: "A defined outcome, timeline and price in NZD, delivered in fortnightly increments you can see and test.",
    includes: ["Agreed scope & milestones", "Fortnightly demos", "Launch support & handover docs"],
  },
  {
    title: "Monthly partnership",
    fit: "Best once a system is live and growing",
    body: "A dedicated team on a retainer for continuous improvement, support and growth marketing.",
    includes: ["Prioritised monthly roadmap", "Support & maintenance", "Plain-language monthly report"],
  },
];

export const faqs = [
  {
    q: "How do you price projects?",
    a: "After a discovery call we send a written proposal with scope, milestones and a fixed price in NZD, excluding GST. If the scope changes, we agree the change in writing before any extra work starts.",
  },
  {
    q: "Who owns the code and data?",
    a: "You do. Code lives in repositories and cloud accounts you own, and we hand over documentation at the end of every engagement. There is no lock-in.",
  },
  {
    q: "Where is the team based?",
    a: "Your lead is in New Zealand and works NZ hours. Delivery is shared with our team in Sri Lanka, which is how we keep enterprise-grade engineering affordable.",
  },
  {
    q: "Where is our data stored?",
    a: "We agree the hosting region with you up front, and can keep data in Australian or New Zealand regions where the platform supports it. Personal information is handled in line with the NZ Privacy Act 2020.",
  },
  {
    q: "Can you work with our existing systems?",
    a: "Yes. Most projects integrate with tools you already use, such as Xero, payment providers, booking systems or Microsoft 365, rather than replacing them.",
  },
  {
    q: "What happens after launch?",
    a: "Every launch includes a support period. After that you can move to a monthly partnership, take the system in-house with our documentation, or call on us as needed.",
  },
];

// Tools we build with — not partner or reseller claims.
export const technologies = [
  "React",
  "Next.js",
  "TypeScript",
  "Supabase",
  "PostgreSQL",
  "Vercel",
  "AWS",
  "n8n",
  "Claude",
  "Xero",
  "Tailwind CSS",
];

export const trustPractices = [
  {
    title: "Least-privilege access",
    body: "Staff and systems get only the access they need. Database rules enforce permissions, not just the user interface.",
  },
  {
    title: "Audit trails",
    body: "Business-critical actions are recorded with who, what and when, so you can answer questions long after the fact.",
  },
  {
    title: "Privacy by design",
    body: "We collect only what is needed and design around the information privacy principles of the NZ Privacy Act 2020.",
  },
  {
    title: "Your accounts, your keys",
    body: "Production systems run in cloud accounts you own. We are invited in, and access is removed when an engagement ends.",
  },
  {
    title: "Human approval for AI",
    body: "AI drafts and recommends; a person approves anything that reaches a customer or changes a record that matters.",
  },
  {
    title: "Tested before it ships",
    body: "Automated tests, code review and staging environments before production — and a rollback plan for every release.",
  },
];
