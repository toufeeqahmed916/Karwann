import { useLang } from "../lib/i18n.jsx";

const STYLES = {
  low: "border-ok/30 bg-ok/10 text-ok",
  medium: "border-warn/40 bg-warn/15 text-ink",
  high: "border-crit/30 bg-crit/10 text-crit",
};

export default function AuthenticityBadge({ review, compact = false }) {
  const { t, num } = useLang();
  if (!review) return null;
  const band = STYLES[review.band] ? review.band : "low";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${STYLES[band]} ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(`authenticity.${band}`)}
      {!compact && <span className="opacity-70" dir="ltr">{num(review.score)}/100</span>}
    </span>
  );
}
