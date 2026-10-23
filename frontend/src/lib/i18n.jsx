// One language for the whole app (English / Urdu). New AI-facing screens use t(); older screens migrate later.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.json";
import ur from "../locales/ur.json";

const DICTIONARIES = { en, ur };
const STORAGE_KEY = "karwan-lang";

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "ur" || saved === "en" ? saved : "en";
  } catch {
    return "en";
  }
}

export function translate(lang, key, vars = {}) {
  const template = DICTIONARIES[lang]?.[key] ?? en[key] ?? key; // Urdu falls back to English, then to the key
  return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode: keep in memory only */ }
  }, []);

  // Only the document language changes here. Direction is applied per AI-facing container (see `dir`),
  // so maps and the existing English screens never flip.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo(() => {
    const t = (key, vars) => translate(lang, key, vars);
    // Friendly text for a service error: translated by code (optionally a screen-specific prefix), else the server message.
    const errorText = (error, fallbackKey, prefix) => {
      const code = error?.code;
      const keys = code ? [prefix && `${prefix}.${code}`, `error.${code}`].filter(Boolean) : [];
      const hit = keys.find((k) => DICTIONARIES[lang][k] || en[k]);
      if (hit) return t(hit);
      return error?.message || t(fallbackKey ?? "error.AI_UNAVAILABLE");
    };
    return { lang, setLang, t, errorText, dir: lang === "ur" ? "rtl" : "ltr", isUrdu: lang === "ur" };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
