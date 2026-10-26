import { useLang } from "../lib/i18n.jsx";

export default function BaselineCard({ summary, baseline }) {
  const { t } = useLang();
  const improvement = summary.overallFulfilmentPct - baseline.overallFulfilmentPct;
  return (
    <section className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("baseline.eyebrow")}</p>
      <h2 className="mt-1 text-xl font-bold">{t("baseline.title")}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-panel bg-lime/30 p-4">
          <p className="text-sm text-mute">{t("baseline.ours")}</p>
          <p className="mt-1 font-display text-3xl font-extrabold" dir="ltr">{summary.overallFulfilmentPct}%</p>
          <p className="mt-1 text-xs text-mute">{t("baseline.critical", { pct: summary.criticalFulfilmentPct })}</p>
        </div>
        <div className="rounded-panel bg-paper p-4">
          <p className="text-sm text-mute">{t("baseline.fcfs")}</p>
          <p className="mt-1 font-display text-3xl font-extrabold" dir="ltr">{baseline.overallFulfilmentPct}%</p>
          <p className="mt-1 text-xs text-mute">{t("baseline.critical", { pct: baseline.criticalFulfilmentPct })}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-done">{t("baseline.improvement", { pts: improvement })}</p>
    </section>
  );
}
