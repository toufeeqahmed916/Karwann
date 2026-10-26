import AuthenticityBadge from "./AuthenticityBadge.jsx";
import { useLang } from "../lib/i18n.jsx";

export default function AuthenticityReviewCard({ review }) {
  const { t, text, place, isRtl } = useLang();
  if (!review) {
    return (
      <section className="rounded-panel border border-line bg-paper p-3">
        <h3 className="font-bold">{t("authenticity.title")}</h3>
        <p className="mt-1 text-sm text-mute">{t("authenticity.noData")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-panel border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">{t("authenticity.title")}</h3>
          <p className="mt-0.5 text-xs text-mute">{t("authenticity.note")}</p>
        </div>
        <AuthenticityBadge review={review} />
      </div>

      {review.reasons?.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {review.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />
              <span>{text(reason)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-mute">{t("authenticity.clear")}</p>
      )}

      {review.matchedAreas?.length > 0 && (
        <p className="mt-3 border-t border-line pt-2 text-xs text-mute">
          {t("authenticity.related")} <strong className="text-ink">{[...new Set(review.matchedAreas)].map(place).join(isRtl ? "، " : ", ")}</strong>
        </p>
      )}
    </section>
  );
}
