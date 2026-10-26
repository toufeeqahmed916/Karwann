import { LANGUAGES, useLanguage } from "../lib/i18n.jsx";

/**
 * Language menu: English, Urdu (اردو) or Sindhi (سنڌي). Choosing one switches the whole app,
 * including the AI assistant (it then understands, answers and speaks that language).
 * Each option is written in its own language so people can always find theirs.
 */
export default function LanguageToggle({ className = "", unstyled = false }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <select
      value={lang}
      onChange={(event) => setLang(event.target.value)}
      aria-label={t("lang.toggleLabel")}
      className={unstyled
        ? `language-toggle ${className}`
        : `language-toggle field w-auto min-w-[116px] shrink-0 rounded-full py-2 ps-3 pe-9 text-sm font-semibold shadow-sm ${className}`}
    >
      {LANGUAGES.map((language) => (
        <option key={language.code} value={language.code} lang={language.code}>{language.label}</option>
      ))}
    </select>
  );
}
