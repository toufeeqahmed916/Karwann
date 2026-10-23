import { ITEM_LABEL } from "../lib/constants.js";

const ACTION_LABEL = {
  dispatched: "Dispatched",
  restocked: "Restocked",
  adjusted: "Removed",
};

export default function StockLog({ entries }) {
  return (
    <section className="panel min-h-0 overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold">Transaction log</h2>
        <p className="mt-1 text-sm text-mute">Latest stock movement for this depot.</p>
      </div>
      {!entries.length ? (
        <div className="p-5 text-sm text-mute">No stock changes yet. Restock or remove an item to create the first log entry.</div>
      ) : (
        <ol className="max-h-[620px] divide-y divide-line overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{ACTION_LABEL[entry.action] ?? entry.action} {ITEM_LABEL[entry.item]}</p>
                  {entry.reason && <p className="mt-1 text-sm text-mute">{entry.reason}</p>}
                </div>
                <strong className={entry.action === "restocked" ? "text-done" : "text-ink"}>
                  {entry.action === "restocked" ? "+" : "-"}{entry.qty.toLocaleString()}
                </strong>
              </div>
              <time className="mt-2 block text-xs text-mute" dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
