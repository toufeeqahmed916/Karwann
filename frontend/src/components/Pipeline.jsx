import { useLang } from "../lib/i18n.jsx";

const STEPS = ["pending", "partially_allocated", "allocated", "in_transit", "delivered"];

export default function Pipeline({ requests }) {
  const { t, num } = useLang();
  const counts = Object.fromEntries(STEPS.map((status) => [status, requests.filter((request) => request.status === status).length]));
  const total = Math.max(1, requests.length);

  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t("pipeline.title")}</h2>
          <p className="text-sm text-mute">{t("pipeline.subtitle")}</p>
        </div>
        <strong>{t("pipeline.total", { n: num(requests.length) })}</strong>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEPS.map((status) => (
          <div key={status} className="rounded-ui border border-line bg-paper p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-mute">{t(`pipeline.${status}`)}</span>
              <strong>{num(counts[status])}</strong>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-ink" style={{ width: `${counts[status] / total * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
