import { useLanguage } from "../lib/i18n.jsx";

/** Switches the whole app between English and Urdu. */
export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label={t("lang.toggleLabel")}>
      {["en", "ur"].map((code) => (
        <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)} lang={code}
          className={`btn px-3 py-1.5 text-xs border ${lang === code ? "bg-ink text-white border-ink" : "bg-card border-line"}`}>
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}
