import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { mi } from "./mi";

// English is the source text; te reo Māori comes from the `mi` dictionary keyed by the
// English string. Anything without a translation falls back to English.

export type Lang = "en" | "mi";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

const KEY = "oreece-lang";

function initialLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "mi" ? "mi" : "en";
  } catch {
    return "en";
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "mi" ? "mi" : "en-NZ";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // Private mode or blocked storage: the choice just won't persist.
    }
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const { lang } = useLang();
  return useCallback((en: string) => (lang === "mi" ? mi[en] ?? en : en), [lang]);
}

export function LangToggle({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const { lang, setLang } = useLang();
  const base = dark ? "text-white/60 hover:text-white" : "text-[hsl(var(--ink)/0.6)] hover:text-[hsl(var(--ink))]";
  const active = dark ? "bg-white text-[hsl(var(--ink))]" : "bg-[hsl(var(--ink))] text-white";
  const opt = (l: Lang, label: string, full: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      aria-label={full}
      lang={l === "mi" ? "mi" : "en"}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${lang === l ? active : base}`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="Language / Reo"
      className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 ${dark ? "border-white/15" : "border-border"} ${className}`}
    >
      {opt("en", "EN", "English")}
      {opt("mi", "MI", "Te reo Māori")}
    </div>
  );
}
