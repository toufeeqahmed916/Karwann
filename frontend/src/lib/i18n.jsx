// Three languages for the whole app: English, Urdu (اردو) and Sindhi (سنڌي).
// Every screen reads its text from src/locales/*.json through t(). Urdu and Sindhi are right-to-left, so choosing
// either one flips the whole page; maps keep their own left-to-right direction.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.json";
import ur from "../locales/ur.json";
import sd from "../locales/sd.json";
import { translatePlace, translateText } from "./backendText.js";

const DICTIONARIES = { en, ur, sd };
const STORAGE_KEY = "karwan-lang";

/** Language menu entries. `label` is written in the language itself so people can always find theirs. */
export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "sd", label: "سنڌي", dir: "rtl" },
];
const isSupported = (code) => LANGUAGES.some((language) => language.code === code);

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isSupported(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

export function translate(lang, key, vars = {}) {
  const template = DICTIONARIES[lang]?.[key] ?? en[key] ?? key; // other languages fall back to English, then to the key
  return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);

  const setLang = useCallback((next) => {
    if (!isSupported(next)) return;
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode: keep in memory only */ }
  }, []);

  // The whole page follows the language: <html lang> and <html dir> flip together, so every screen,
  // form and table lays out right-to-left in Urdu and Sindhi. Maps set dir="ltr" on themselves (see MapView).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES.find((language) => language.code === lang).dir;
  }, [lang]);

  const value = useMemo(() => {
    const t = (key, vars) => translate(lang, key, vars);
    const isRtl = lang !== "en";
    // Friendly text for a service error: translated by code (optionally a screen-specific prefix), else the server message.
    const errorText = (error, fallbackKey, prefix) => {
      const code = error?.code;
      const keys = code ? [prefix && `${prefix}.${code}`, `error.${code}`].filter(Boolean) : [];
      const hit = keys.find((k) => DICTIONARIES[lang][k] || en[k]);
      if (hit) return t(hit);
      return error?.message || t(fallbackKey ?? "error.AI_UNAVAILABLE");
    };
    const dateLocale = { en: "en-US", ur: "ur-PK-u-nu-latn", sd: "sd-PK-u-nu-latn" }[lang]; // Latin digits everywhere
    return {
      lang, setLang, t, errorText, dir: isRtl ? "rtl" : "ltr",
      isRtl, isUrdu: lang === "ur", isSindhi: lang === "sd", isUr: isRtl, // isUr is kept for older code: it means "right-to-left"
      // numbers, place names, text arriving from the API, and dates, in the current language
      num: (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("en-US")),
      place: (name) => translatePlace(name, lang),
      text: (message) => translateText(message, lang),
      date: (value2, options) => {
        try {
          return new Date(value2).toLocaleString(dateLocale, options);
        } catch {
          return new Date(value2).toLocaleString("en-US", options);
        }
      },
      itemName: (key) => t(`item.${key}`),
      statusName: (key) => t(`status.${key}`),
      urgencyName: (key) => t(`urgency.${key}`),
      accessName: (key) => t(`access.${key}`),
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}

/** Short alias used by the screens. */
export const useLang = useLanguage;
