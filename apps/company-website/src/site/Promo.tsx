import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { sale, saleLive } from "./pricing";
import { useT } from "./i18n";

/** Time left until the sale ends, ticking each second. Null once it has ended. */
export function useCountdown(end: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ms = end.getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ dark = false }: { dark?: boolean }) {
  const tr = useT();
  const left = useCountdown(sale.endsAt);
  if (!left) return null;
  const parts = [
    { v: left.d, l: tr("days") },
    { v: left.h, l: tr("hrs") },
    { v: left.m, l: tr("min") },
    { v: left.s, l: tr("sec") },
  ];
  return (
    <div className="flex gap-2" role="timer" aria-label={tr("Time left in the Black Friday offer")}>
      {parts.map((p) => (
        <div
          key={p.l}
          className={`min-w-[58px] rounded-lg px-2 py-2 text-center ${dark ? "bg-white/10 text-white" : "bg-[hsl(var(--ink))] text-white"}`}
        >
          <div className="font-display text-2xl font-semibold tabular-nums leading-none">{String(p.v).padStart(2, "0")}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

const DISMISS_KEY = "oreece-bf-2026-dismissed";

/** Small corner card advertising the sale on every page except /pricing. Hides itself after the deadline. */
export function SalePromo() {
  const tr = useT();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (dismissed || !saleLive() || pathname === "/pricing" || pathname === "/contact") return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage blocked: it simply comes back on the next page load
    }
  };

  return (
    <div
      className={`fixed bottom-5 left-3 right-24 z-30 max-w-sm transition-all duration-500 sm:bottom-6 sm:left-6 sm:right-auto ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--ink))] p-5 text-white shadow-[0_20px_50px_-15px_hsl(222_47%_7%/0.6)]">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <button type="button" onClick={close} aria-label={tr("Dismiss")} className="absolute right-3 top-3 rounded p-1 text-white/50 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <span className="relative inline-flex rounded-full bg-[hsl(var(--brand-red))] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]">
          {tr("Black Friday")}
        </span>
        <p className="relative mt-3 pr-6 text-lg font-semibold leading-snug">{tr("50% off setup on website plans — save up to $124.50.")}</p>
        <p className="relative mt-1 text-sm text-white/60">{tr("Ends Monday 30 November, 11:59pm.")}</p>
        <Link to="/pricing" onClick={close} className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--brand-red-light))] hover:underline">
          {tr("See website plans")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
