import { useState } from "react";
import { ITEM_LABEL } from "../lib/constants.js";

const TAG_STYLE = {
  gained: "bg-done/10 text-done",
  lost: "bg-crit/10 text-crit",
  same: "bg-paper text-mute",
};

export default function DiffList({ requests }) {
  const [filter, setFilter] = useState("all");
  const counts = {
    gained: requests.filter((request) => request.tag === "gained").length,
    lost: requests.filter((request) => request.tag === "lost").length,
    same: requests.filter((request) => request.tag === "same").length,
  };
  const visible = filter === "all" ? requests : requests.filter((request) => request.tag === filter);

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-bold">Request impact</h2>
          <p className="text-sm text-mute">Who gains, loses or stays the same.</p>
        </div>
        <div className="flex gap-1">
          {[['all', requests.length], ['gained', counts.gained], ['lost', counts.lost], ['same', counts.same]].map(([tag, count]) => (
            <button key={tag} type="button" onClick={() => setFilter(tag)}
              className={`rounded-ui px-2.5 py-1.5 text-xs font-semibold capitalize ${filter === tag ? "bg-ink text-white" : "bg-paper"}`}>
              {tag} {count}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[560px] divide-y divide-line overflow-y-auto">
        {visible.map((request) => (
          <article key={request.requestId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{request.area}</h3>
                <p className="mt-1 text-sm text-mute">{request.reason}</p>
              </div>
              <span className={`rounded-ui px-2 py-1 text-xs font-semibold capitalize ${TAG_STYLE[request.tag]}`}>{request.tag}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-mute">{request.fulfilmentBeforePct}%</span>
              <span aria-hidden="true">→</span>
              <strong className={request.tag === "gained" ? "text-done" : request.tag === "lost" ? "text-crit" : ""}>{request.fulfilmentAfterPct}%</strong>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {request.items.filter((item) => item.before !== item.after).map((item) => (
                <span key={item.item} className="rounded bg-paper px-2 py-1 text-xs">
                  {ITEM_LABEL[item.item]} {item.before} → {item.after}
                </span>
              ))}
            </div>
          </article>
        ))}
        {!visible.length && <p className="p-5 text-sm text-mute">No requests in this category.</p>}
      </div>
    </section>
  );
}
