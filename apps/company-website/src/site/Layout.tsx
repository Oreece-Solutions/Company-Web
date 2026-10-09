import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { company, services } from "./content";

const nav = [
  { to: "/services", label: "Services" },
  { to: "/work", label: "Work" },
  { to: "/about", label: "About" },
  { to: "/careers", label: "Careers" },
];

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title === "Oreece" ? "Oreece — Software, AI & Growth for New Zealand Business" : `${title} | Oreece`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Oreece home">
      <img src="/Oreece%20Icon.png" alt="" className="h-8 w-8" />
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? "text-white" : "text-[hsl(var(--ink))]"}`}>
        Oreece
      </span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? "border-border shadow-[0_1px_12px_hsl(222_47%_7%/0.06)]" : "border-transparent"
      }`}
    >
      <div className="wrap flex h-[72px] items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-[hsl(var(--ink))]" : "text-muted-foreground hover:text-[hsl(var(--ink))]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">
          <Link to="/contact" className="btn-dark py-2.5">
            Talk to us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <button
          className="-mr-2 p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-white md:hidden">
          <nav className="wrap flex flex-col py-4" aria-label="Mobile">
            {[...nav, { to: "/contact", label: "Contact" }].map((item) => (
              <Link key={item.to} to={item.to} className="py-3 text-lg font-medium text-[hsl(var(--ink))]">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[hsl(var(--ink))] text-white">
      <div className="wrap grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            Software, AI and growth for New Zealand businesses. Local accountability, backed by a dedicated
            delivery team.
          </p>
          <a href={`mailto:${company.email}`} className="mt-6 inline-block text-sm font-semibold text-white hover:underline">
            {company.email}
          </a>
        </div>
        <FooterCol title="Services">
          {services.map((s) => (
            <Link key={s.slug} to={`/services#${s.slug}`}>{s.title}</Link>
          ))}
        </FooterCol>
        <FooterCol title="Company">
          <Link to="/work">Our work</Link>
          <Link to="/about">About</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/contact">Contact</Link>
        </FooterCol>
        <FooterCol title="Where we work">
          {company.regions.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <span>© {year} {company.legalName}. All rights reserved.</span>
          <span>Prices quoted in NZD, excluding GST.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="md:col-span-2 lg:col-span-2 [&:nth-child(2)]:md:col-span-3 [&:nth-child(4)]:md:col-span-3">
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
      <main id="main" className="flex-1 pt-[72px]">
        {children}
      </main>
      <Footer />
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

export function PageHero({ eyebrow, title, lede, children }: { eyebrow: string; title: ReactNode; lede: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-[hsl(var(--ink))] text-white">
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[hsl(var(--brand-red)/0.18)] blur-3xl" aria-hidden />
      <div className="wrap relative py-20 sm:py-28">
        <span className="eyebrow eyebrow-light">{eyebrow}</span>
        <h1 className="h-display mt-6 max-w-4xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">{lede}</p>
        {children}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="bg-surface">
      <div className="wrap py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--brand-red))] px-6 py-14 text-white sm:px-14">
          <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="h-section">Have a project in mind?</h2>
              <p className="mt-4 text-lg text-white/85">
                Tell us what you are trying to achieve. We will come back within one business day with honest
                advice and next steps — no obligation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="btn bg-white text-[hsl(var(--ink))] hover:bg-white/90">
                Start a conversation <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={`mailto:${company.email}`} className="btn-outline-light">
                {company.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
