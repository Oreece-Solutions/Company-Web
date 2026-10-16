import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUp, ChevronRight, Menu, X } from "lucide-react";
import { company, industries, services, socials } from "./content";
import { Silk } from "./Silk";
import { LangToggle, useT } from "./i18n";

const nav = [
  { to: "/services", label: "Services" },
  { to: "/work", label: "Work" },
  { to: "/industries", label: "Industries" },
  { to: "/about", label: "About" },
];

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title === "Oreece" ? "Oreece — Software, AI & Growth, Built in New Zealand" : `${title} | Oreece`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    // oreece.co.nz is the primary domain; oreece.com redirects here (vercel.json).
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://www.oreece.co.nz${window.location.pathname === "/" ? "/" : window.location.pathname}`;
  }, [title, description]);
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Oreece home">
      <img
        src={light ? "/oreece-wordmark-white.png" : "/oreece-wordmark-red.png"}
        alt="Oreece"
        width={546}
        height={128}
        className={light ? "h-8 w-auto" : "h-6 w-auto sm:h-7"}
      />
    </Link>
  );
}

function Header() {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  // Full-screen menu: lock page scroll, hide the WhatsApp bubble and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.menuOpen = "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.menuOpen;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // Hide while scrolling down, slide back in on any scroll up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 120);
        last = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <MobileMenu open={open} />
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 transition-transform duration-500 ease-[cubic-bezier(0.22,0.9,0.35,1)] sm:pt-5 ${
          hidden && !open ? "-translate-y-[130%]" : ""
        }`}
      >
        <div
          className={`nav-pill pointer-events-auto w-full max-w-[960px] rounded-xl bg-white transition-all duration-500 ${
            scrolled ? "shadow-[0_12px_40px_-12px_hsl(222_47%_7%/0.28)]" : "shadow-[0_4px_24px_-12px_hsl(222_47%_7%/0.2)]"
          }`}
        >
          <div className="flex h-14 items-center justify-between pl-4 pr-1.5 sm:h-[60px] sm:pl-5">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
                  {tr(item.label)}
                </NavLink>
              ))}
            </nav>
            <LangToggle className="ml-auto mr-2 hidden md:ml-0 md:inline-flex" />
            <Link to="/contact" className="btn-primary hidden rounded-lg px-5 py-2.5 md:inline-flex">
              {tr("Let’s talk")}
            </Link>
            <Burger open={open} onClick={() => setOpen((v) => !v)} label={open ? tr("Close menu") : tr("Open menu")} />
          </div>
        </div>
      </header>
    </>
  );
}

function Burger({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={label}
      className={`burger mr-0.5 md:hidden ${open ? "is-open" : ""}`}
    >
      <span className="burger-line burger-top" />
      <span className="burger-line burger-bottom" />
    </button>
  );
}

function MobileMenu({ open }: { open: boolean }) {
  const tr = useT();
  const tab = open ? 0 : -1;
  return (
    <div id="mobile-menu" className={`m-menu md:hidden ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <nav aria-label="Mobile" className="wrap flex min-h-full flex-col pb-6 pt-24">
        <ul className="border-t border-border">
          {nav.map((item, i) => (
            <li key={item.to} className="m-menu-item border-b border-border" style={{ transitionDelay: open ? `${140 + i * 55}ms` : "0ms" }}>
              <NavLink to={item.to} tabIndex={tab} className={({ isActive }) => `m-menu-link group ${isActive ? "is-active" : ""}`}>
                <span className="w-7 text-xs font-semibold tabular-nums text-[hsl(var(--ink)/0.35)]">0{i + 1}</span>
                <span className="m-menu-text">{tr(item.label)}</span>
                <ArrowRight className="ml-auto h-5 w-5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-[.is-active]:translate-x-0 group-[.is-active]:opacity-100" />
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="m-menu-item mt-auto pt-10" style={{ transitionDelay: open ? "380ms" : "0ms" }}>
          <a href={`mailto:${company.email}`} tabIndex={tab} className="mb-4 block text-sm font-semibold text-[hsl(var(--ink)/0.6)] hover:text-[hsl(var(--brand-red))]">
            {company.email}
          </a>
          <Link to="/contact" tabIndex={tab} className="btn-primary w-full justify-center rounded-xl py-4 text-base">
            {tr("Let’s talk")} <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="mt-5 flex items-center justify-between">
            <LangToggle />
            <SocialLinks light />
          </div>
        </div>
      </nav>
    </div>
  );
}

function Footer() {
  const tr = useT();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[hsl(var(--ink))] text-white">
      <div className="wrap grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            {tr("Software, AI and growth for businesses everywhere. Based in Aotearoa New Zealand, backed by a dedicated delivery team.")}
          </p>
          <div className="mt-6 flex flex-col gap-2 text-sm font-semibold">
            <a href={`mailto:${company.email}`} className="hover:underline">{company.email}</a>
            <a href={company.phoneHref} className="hover:underline">{company.phone}</a>
            <a href={company.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#4ade80] hover:underline">
              <WhatsAppIcon className="h-4 w-4" /> {tr("Chat on WhatsApp")}
            </a>
          </div>
          <SocialLinks />
          <LangToggle dark className="mt-6" />
        </div>
        <FooterCol title={tr("Services")}>
          {services.map((s) => (
            <Link key={s.slug} to={`/services#${s.slug}`}>{tr(s.title)}</Link>
          ))}
        </FooterCol>
        <FooterCol title={tr("Industries")}>
          {industries.map((i) => (
            <Link key={i.slug} to={`/industries#${i.slug}`}>{tr(i.name)}</Link>
          ))}
        </FooterCol>
        <FooterCol title={tr("Company")}>
          <Link to="/work">{tr("Our work")}</Link>
          <Link to="/about">{tr("About")}</Link>
          <Link to="/trust">{tr("Trust & security")}</Link>
          <Link to="/careers">{tr("Careers")}</Link>
          <Link to="/contact">{tr("Contact")}</Link>
          <Link to="/contact?type=rfp">{tr("Submit an RFP")}</Link>
        </FooterCol>
      </div>
      <div className="wrap border-t border-white/10 py-6 text-sm text-white/60">
        <span className="font-semibold text-white/80">{tr("Where we work:")}</span> {company.regions.join(" · ")} · {tr("Clients worldwide, in person or on video")}
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <span>© {year} {company.legalName}. {tr("All rights reserved.")}</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/privacy" className="hover:text-white">{tr("Privacy")}</Link>
            <Link to="/trust" className="hover:text-white">{tr("Security")}</Link>
            <span>{tr("Prices quoted in NZD, excluding GST where applicable.")}</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1 font-semibold text-white/70 hover:text-white"
            >
              {tr("Back to top")} <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="md:col-span-3 [&:nth-child(4)]:md:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">{title}</h3>
      <div className="mt-4 flex flex-col gap-3 text-sm text-white/75 [&_a:hover]:text-white">{children}</div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <a
        href={company.whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Oreece on WhatsApp"
        className="wa-float fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </div>
  );
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export type Crumb = { to?: string; label: string };

export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <div className="p-2">
      <section className="hero-frame relative overflow-hidden rounded-2xl bg-[hsl(var(--ink))] text-white">
        <div className="hero-aurora" aria-hidden />
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="wrap relative pb-20 pt-36 sm:pb-24 sm:pt-44">
          {crumbs && <Breadcrumbs items={crumbs} />}
          <span className="eyebrow eyebrow-light anim-fade-up">{eyebrow}</span>
          <h1 className="h-display mt-6 max-w-4xl">
            <SplitWords text={typeof title === "string" ? title : ""} fallback={title} />
          </h1>
          <p className="anim-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl" style={{ animationDelay: "450ms" }}>
            {lede}
          </p>
          {children && (
            <div className="anim-fade-up" style={{ animationDelay: "600ms" }}>
              {children}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Breadcrumbs({ items }: { items: Crumb[] }) {
  const tr = useT();
  return (
    <nav aria-label="Breadcrumb" className="anim-fade-up mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/55">
        <li>
          <Link to="/" className="hover:text-white">{tr("Home")}</Link>
        </li>
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            {c.to ? (
              <Link to={c.to} className="hover:text-white">{tr(c.label)}</Link>
            ) : (
              <span aria-current="page" className="text-white/85">{tr(c.label)}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Headline that rises in word by word on load. */
export function SplitWords({ text, fallback, delay = 0 }: { text: string; fallback?: ReactNode; delay?: number }) {
  if (!text) return <>{fallback}</>;
  return (
    <span aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <span className="word-rise inline-block" style={{ animationDelay: `${delay + i * 70}ms` }}>
            {w}&nbsp;
          </span>
        </span>
      ))}
    </span>
  );
}

export function CtaBand() {
  const tr = useT();
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1400px] gap-5 px-3 sm:px-5 lg:grid-cols-[1fr_2fr]">
        <Link
          to="/careers"
          className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl bg-[hsl(var(--ink))] p-8 text-white sm:p-10"
        >
          <div className="grid-lines absolute inset-0" aria-hidden />
          <span className="pill-label relative border-white/20">{tr("Careers")}</span>
          <h2 className="relative mt-auto text-3xl font-semibold leading-tight sm:text-4xl">{tr("Want to build with us?")}</h2>
          <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors group-hover:text-white">
            {tr("Explore opportunities")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          to="/contact"
          className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-2xl p-8 text-white sm:min-h-[420px] sm:p-12"
        >
          <Silk className="transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden />
          <span className="pill-label relative border-white/25 bg-black/15 backdrop-blur-sm">{tr("Get in touch")}</span>
          <div className="relative mt-auto">
            <p className="text-xl font-light text-white/90 sm:text-3xl">{tr("Have a project in mind?")}</p>
            <p className="mt-2 flex items-center gap-4 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
              {tr("Let’s talk")}
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[hsl(var(--brand-red))] transition-transform duration-300 group-hover:translate-x-2 group-hover:-rotate-45 sm:h-16 sm:w-16">
                <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
            </p>
            <p className="mt-5 max-w-xl text-white/80">
              {tr("Honest advice and next steps within one business day — no obligation.")}
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}

export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.37 9.37 0 0 1 6.67 2.77 9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.6l6.01-1.58a11.33 11.33 0 0 0 5.43 1.38h.01c6.25 0 11.34-5.08 11.35-11.34 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  );
}

const socialPaths: Record<string, string> = {
  LinkedIn:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  Facebook:
    "M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07",
  TikTok:
    "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  Instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z",
};

function SocialLinks({ light = false }: { light?: boolean }) {
  const live = socials.filter((s) => s.url);
  if (!live.length) return null;
  return (
    <div className={light ? "flex gap-2" : "mt-6 flex gap-3"}>
      {live.map((s) => (
        <a
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Oreece on ${s.name}`}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
            light
              ? "border-border text-[hsl(var(--ink)/0.6)] hover:border-[hsl(var(--brand-red))] hover:text-[hsl(var(--brand-red))]"
              : "border-white/15 text-white/70 hover:border-white hover:text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d={socialPaths[s.name]} />
          </svg>
        </a>
      ))}
    </div>
  );
}
