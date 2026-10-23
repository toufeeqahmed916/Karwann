import { confidenceLevel } from "./ConfidenceBadge.jsx";
import { useLanguage } from "../lib/i18n.jsx";

const FIELDS = ["area", "people", "urgency", "vulnerable", "supplies", "access"];

/** Review banner shown above the editable form. The form fields themselves are the confirmation. */
export default function ConfirmRequestCard({ result, sourceText, hasPin }) {
  const { t, dir } = useLanguage();
  const flagged = FIELDS.filter((k) => confidenceLevel(result.confidence[k]) !== "high");
  const noQty = result.supplies.filter((s) => !(s.qty > 0));
  const showOriginal = sourceText && sourceText.trim() !== result.englishText?.trim();

  return (
    <section dir={dir} className="panel space-y-3 border-ink p-5" aria-labelledby="confirm-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("confirm.eyebrow")}</p>
        <h3 id="confirm-title" className="text-lg font-bold">{t("confirm.title")}</h3>
        <p className="text-sm text-mute">{t("confirm.body", { button: t("confirm.button") })}</p>
      </div>

      {result.englishText && (
        <div>
          <span className="label">{result.detectedLanguage === "ur" ? t("confirm.translation") : t("confirm.understood")}</span>
          <p dir="auto" className="rounded-ui bg-paper p-3 text-sm">{result.englishText}</p>
        </div>
      )}
      {showOriginal && (
        <div>
          <span className="label">{t("confirm.original")}</span>
          <p dir="auto" className="rounded-ui bg-paper p-3 text-sm">{sourceText}</p>
        </div>
      )}

      <ul className="space-y-1 text-sm">
        {!hasPin && <li><strong>!</strong> {t("confirm.pin")}</li>}
        {result.peopleIsEstimate && result.people != null && <li><strong>!</strong> {t("confirm.estimate", { n: result.people.toLocaleString() })}</li>}
        {noQty.map((s) => <li key={s.item}><strong>!</strong> {t("confirm.noQty", { item: t(`item.${s.item}`) })}</li>)}
        {flagged.length > 0 && <li><strong>?</strong> {t("confirm.check", { fields: flagged.map((k) => t(`field.${k}`)).join(dir === "rtl" ? "، " : ", ") })}</li>}
      </ul>
    </section>
  );
}
