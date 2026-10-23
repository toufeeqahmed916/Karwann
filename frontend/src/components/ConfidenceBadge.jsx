import { useLanguage } from "../lib/i18n.jsx";

// Confidence is shown as an icon AND words, never colour alone.
export function confidenceLevel(value) {
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "check";
  return "needs";
}

const LEVELS = {
  high: { icon: "✓", cls: "border-done" },
  check: { icon: "!", cls: "border-wait" },
  needs: { icon: "?", cls: "border-crit text-crit" },
};

export default function ConfidenceBadge({ value = 0, estimate = false, edited = false }) {
  const { t, dir } = useLanguage();
  if (edited) {
    return (
      <span dir={dir} className="inline-flex items-center gap-1 rounded-ui border border-line px-2 py-0.5 text-xs font-medium text-mute">
        <span aria-hidden="true">✎</span>{t("confidence.edited")}
      </span>
    );
  }
  const level = confidenceLevel(value);
  return (
    <span dir={dir} className="inline-flex flex-wrap items-center gap-1">
      <span className={`inline-flex items-center gap-1 rounded-ui border px-2 py-0.5 text-xs font-medium ${LEVELS[level].cls}`}>
        <span aria-hidden="true">{LEVELS[level].icon}</span>{t(`confidence.${level}`)}
      </span>
      {estimate && (
        <span className="inline-flex items-center rounded-ui border border-wait px-2 py-0.5 text-xs font-medium">{t("confidence.estimate")}</span>
      )}
    </span>
  );
}
