import { useLang } from "../lib/i18n.jsx";

const KNOWN_ACTIONS = ["dispatched", "restocked", "adjusted"];

export default function StockLog({ entries }) {
  const { t, num, text, date, itemName } = useLang();
  return (
    <section className="panel min-h-0 overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold">{t("stockLog.title")}</h2>
        <p className="mt-1 text-sm text-mute">{t("stockLog.subtitle")}</p>
      </div>
      {!entries.length ? (
        <div className="p-5 text-sm text-mute">{t("stockLog.empty")}</div>
      ) : (
        <ol className="max-h-[620px] divide-y divide-line overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{KNOWN_ACTIONS.includes(entry.action) ? t(`stockLog.${entry.action}`, { item: itemName(entry.item) }) : `${entry.action} ${itemName(entry.item)}`}</p>
                  {entry.reason && <p className="mt-1 text-sm text-mute">{text(entry.reason)}</p>}
                </div>
                <strong dir="ltr" className={entry.action === "restocked" ? "text-done" : "text-ink"}>
                  {entry.action === "restocked" ? "+" : "-"}{num(entry.qty)}
                </strong>
              </div>
              <time className="mt-2 block text-xs text-mute" dateTime={entry.createdAt}>
                {date(entry.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
