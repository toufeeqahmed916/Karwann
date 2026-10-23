import { useEffect, useRef, useState } from "react";
import { getRequests, getWeights, putWeights, getDepots } from "../lib/api.js";
import { ITEM_LABEL } from "../lib/constants.js";
import MapView from "../components/MapView.jsx";
import ScoreBars from "../components/ScoreBars.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import WeightSliders from "../components/WeightSliders.jsx";

export default function RequestsPage() {
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

  if (loading) return <p className="p-6 text-mute">Loading requests...</p>;
  if (error) return <p role="alert" className="p-6 text-crit">{error}</p>;
  if (!requests.length) return <p className="p-6">No requests yet. Add one from the Requester screen or reset the demo data.</p>;

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[380px_1fr_340px]">
      <section className="panel flex min-h-0 flex-col">
        <h2 className="border-b border-line px-4 py-3 text-lg font-bold">Request queue</h2>
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {requests.map((r, i) => (
            <li key={r.id}>
              <button onClick={() => setSelectedId(r.id)}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-paper ${r.id === selectedId ? "bg-lime/40" : ""}`}>
                <span className="w-6 text-sm text-mute">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.area}</span>
                  <span className="block text-sm text-mute">{r.population.toLocaleString()} people, {r.urgency}</span>
                </span>
                <span className="font-display text-2xl font-extrabold">{r.score.total}</span>
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
                <h2 className="text-xl font-bold">{selected.area}</h2>
                <p className="text-sm text-mute">Waiting {selected.hoursWaiting} h, access {selected.accessibility}{selected.vulnerable ? ", vulnerable group" : ""}</p>
              </div>
              <StatusBadge request={selected} />
            </div>
            <p className="mb-3 text-sm">Total score <strong>{selected.score.total}</strong> out of 100</p>
            <ScoreBars score={selected.score} weights={weights} />
            <section className="mt-5 rounded-panel border border-line bg-paper p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">Requested supplies</h3>
                  <p className="mt-0.5 text-xs text-mute">Quantities selected by the requester</p>
                </div>
                <span className="rounded-ui bg-card px-2 py-1 text-sm font-bold">{totalNeeded.toLocaleString()} units</span>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-ui border border-line bg-card text-sm">
                {selected.items.map((item) => {
                  const remaining = Math.max(0, item.qtyNeeded - item.qtyAllocated);
                  return (
                    <li key={item.item} className="p-3">
                      <div className="flex justify-between gap-3">
                        <strong>{ITEM_LABEL[item.item]}</strong>
                        <strong>{item.qtyNeeded.toLocaleString()} requested</strong>
                      </div>
                      <div className="mt-1 flex justify-between gap-3 text-xs text-mute">
                        <span>{item.qtyAllocated.toLocaleString()} allocated</span>
                        <span>{remaining.toLocaleString()} remaining</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-mute">Total allocated</span>
                <strong>{totalAllocated.toLocaleString()} of {totalNeeded.toLocaleString()}</strong>
              </div>
            </section>
          </div>
        )}
        <div className="border-t border-line pt-4">
          <h3 className="mb-3 text-base font-bold">Priority weights</h3>
          {weights && <WeightSliders weights={weights} onChange={onWeights} />}
        </div>
      </aside>
    </div>
  );
}
