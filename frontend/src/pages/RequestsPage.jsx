import { useEffect, useRef, useState } from "react";
import { getRequests, getWeights, putWeights, getDepots } from "../lib/api.js";
import { useLang } from "../lib/i18n.jsx";
import MapView from "../components/MapView.jsx";
import ScoreBars from "../components/ScoreBars.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import WeightSliders from "../components/WeightSliders.jsx";
import AuthenticityBadge from "../components/AuthenticityBadge.jsx";
import AuthenticityReviewCard from "../components/AuthenticityReviewCard.jsx";

export default function RequestsPage() {
  const { t, num, place, text, itemName, urgencyName, accessName } = useLang();
  const [requests, setRequests] = useState([]);
  const [depots, setDepots] = useState([]);
  const [weights, setWeights] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const timer = useRef();

  useEffect(() => {
    Promise.all([getRequests(), getWeights(), getDepots()])
      .then(([r, w, d]) => { setRequests(r); setWeights(w); setDepots(d); setSelectedId(r[0]?.id ?? null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Re-rank live while sliders move (debounced so we do not spam the API)
  function onWeights(next) {
    setWeights(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      putWeights(next).then((res) => setRequests(res.requests)).catch((e) => setError(e.message));
    }, 150);
  }

  const selected = requests.find((r) => r.id === selectedId);
  const totalNeeded = selected?.items.reduce((total, item) => total + item.qtyNeeded, 0) ?? 0;
  const totalAllocated = selected?.items.reduce((total, item) => total + item.qtyAllocated, 0) ?? 0;

  if (loading) return <p className="p-6 text-mute">{t("requests.loading")}</p>;
  if (error) return <p role="alert" className="p-6 text-crit">{text(error)}</p>;
  if (!requests.length) return <p className="p-6">{t("requests.empty")}</p>;

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[380px_1fr_340px]">
      <section className="panel flex min-h-0 flex-col">
        <h2 className="border-b border-line px-4 py-3 text-lg font-bold">{t("requests.queue")}</h2>
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {requests.map((r, i) => (
            <li key={r.id}>
              <button onClick={() => setSelectedId(r.id)}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-start hover:bg-paper ${r.id === selectedId ? "bg-lime/40" : ""}`}>
                <span className="w-6 text-sm text-mute">{num(i + 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{place(r.area)}</span>
                  <span className="block text-sm text-mute">{t("requests.peopleUrgency", { n: num(r.population), urgency: urgencyName(r.urgency) })}</span>
                  {r.authenticity?.band !== "low" && <span className="mt-1 inline-block"><AuthenticityBadge review={r.authenticity} compact /></span>}
                </span>
                <span className="font-display text-2xl font-extrabold">{num(r.score.total)}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="min-h-[360px] lg:min-h-0">
        <MapView requests={requests} depots={depots} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      <aside className="panel min-h-0 space-y-6 overflow-y-auto p-4">
        {selected && (
          <div>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{place(selected.area)}</h2>
                <p className="text-sm text-mute">{t("requests.waitingLine", { h: num(selected.hoursWaiting), access: accessName(selected.accessibility) })}{selected.vulnerable ? t("requests.vulnerableSuffix") : ""}</p>
              </div>
              <StatusBadge request={selected} />
            </div>
            <p className="mb-3 text-sm">{t("requests.totalScore", { score: num(selected.score.total) })}</p>
            <ScoreBars score={selected.score} weights={weights} />
            <div className="mt-5"><AuthenticityReviewCard review={selected.authenticity} /></div>
            <section className="mt-5 rounded-panel border border-line bg-paper p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{t("requests.requestedSupplies")}</h3>
                  <p className="mt-0.5 text-xs text-mute">{t("requests.requestedHelp")}</p>
                </div>
                <span className="rounded-ui bg-card px-2 py-1 text-sm font-bold">{t("common.unitsValue", { n: num(totalNeeded) })}</span>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-ui border border-line bg-card text-sm">
                {selected.items.map((item) => {
                  const remaining = Math.max(0, item.qtyNeeded - item.qtyAllocated);
                  return (
                    <li key={item.item} className="p-3">
                      <div className="flex justify-between gap-3">
                        <strong>{itemName(item.item)}</strong>
                        <strong>{t("requests.requestedQty", { n: num(item.qtyNeeded) })}</strong>
                      </div>
                      <div className="mt-1 flex justify-between gap-3 text-xs text-mute">
                        <span>{t("requests.allocatedQty", { n: num(item.qtyAllocated) })}</span>
                        <span>{t("requests.remainingQty", { n: num(remaining) })}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-mute">{t("requests.totalAllocated")}</span>
                <strong>{t("requests.ofTotal", { a: num(totalAllocated), n: num(totalNeeded) })}</strong>
              </div>
            </section>
          </div>
        )}
        <div className="border-t border-line pt-4">
          <h3 className="mb-3 text-base font-bold">{t("requests.weights")}</h3>
          {weights && <WeightSliders weights={weights} onChange={onWeights} />}
        </div>
      </aside>
    </div>
  );
}
