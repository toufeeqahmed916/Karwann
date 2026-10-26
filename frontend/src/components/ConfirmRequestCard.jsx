import { confidenceLevel } from "./ConfidenceBadge.jsx";
import { useLanguage } from "../lib/i18n.jsx";
import { useTranslatedText } from "../lib/useAutoTranslate.js";

const FIELDS = ["area", "people", "urgency", "vulnerable", "supplies", "access"];

/** Review banner shown above the editable form. The form fields themselves are the confirmation. */
export default function ConfirmRequestCard({ result, sourceText, hasPin }) {
  const { t, dir, lang, num } = useLanguage();
  const flagged = FIELDS.filter((k) => confidenceLevel(result.confidence[k]) !== "high");
  const noQty = result.supplies.filter((s) => !(s.qty > 0));

  // "What we understood" is always shown in the language that is selected now, even if it was changed after the
  // report was analysed. If the person typed the report in that same language, their own words are the summary.
  // For a voice report the AI service returns what it heard (`transcript`); for a typed report it is the typed text.
  const original = sourceText?.trim() || result.transcript?.trim() || "";
  const typedInThisLanguage = !!original && result.detectedLanguage === lang;
  const translated = useTranslatedText(result.englishText, lang, !typedInThisLanguage);
  const understood = typedInThisLanguage ? original : translated.text;
  const showOriginal = !!original && !typedInThisLanguage && original !== understood?.trim();

  return (
    <section dir={dir} className="panel space-y-3 border-ink p-5" aria-labelledby="confirm-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("confirm.eyebrow")}</p>
        <h3 id="confirm-title" className="text-lg font-bold">{t("confirm.title")}</h3>
        <p className="text-sm text-mute">{t("confirm.body", { button: t("confirm.button") })}</p>
      </div>

      {understood && (
        <div>
          <span className="label">{t("confirm.understood")}</span>
          <p dir="auto" className={`rounded-ui bg-paper p-3 text-sm ${translated.pending ? "opacity-50" : ""}`}>{understood}</p>
          {translated.pending && <p className="mt-1 text-xs text-mute" role="status">{t("translate.working")}</p>}
        </div>
      )}
      {showOriginal && (
        <div>
          <span className="label">{t("confirm.original")}</span>
          <p dir="auto" className="rounded-ui bg-paper p-3 text-sm">{original}</p>
        </div>
      )}

      <ul className="space-y-1 text-sm">
        {!hasPin && <li><strong>!</strong> {t("confirm.pin")}</li>}
        {result.peopleIsEstimate && result.people != null && <li><strong>!</strong> {t("confirm.estimate", { n: num(result.people) })}</li>}
        {noQty.map((s) => <li key={s.item}><strong>!</strong> {t("confirm.noQty", { item: t(`item.${s.item}`) })}</li>)}
        {flagged.length > 0 && <li><strong>?</strong> {t("confirm.check", { fields: flagged.map((k) => t(`field.${k}`)).join(dir === "rtl" ? "، " : ", ") })}</li>}
      </ul>
    </section>
  );
}
