import { useEffect, useState } from "react";
import KpiCard from "../components/KpiCard.jsx";
import HeatLayer from "../components/HeatLayer.jsx";
import LayerSwitch from "../components/LayerSwitch.jsx";
import MapView from "../components/MapView.jsx";
import Pipeline from "../components/Pipeline.jsx";
import RouteLayer from "../components/RouteLayer.jsx";
import TruckLayer from "../components/TruckLayer.jsx";
import ScoreBars from "../components/ScoreBars.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { advanceTime, getCoordinatorOverview, getRoute } from "../lib/api.js";
import { ITEM_LABEL } from "../lib/constants.js";
import { subscribeToDeliveryUpdates } from "../lib/realtime.js";

const LEGEND = [
  ["#D93636", "Critical"], ["#EF8A1F", "High"], ["#E3C21B", "Waiting"],
  ["#2F6FDE", "In transit"], ["#2E9D5B", "Delivered"],
];

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");
  const [heatLayer, setHeatLayer] = useState("need");
  const [route, setRoute] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [connection, setConnection] = useState({ paused: false, mode: "polling" });

  async function load() {
    const data = await getCoordinatorOverview();
    setOverview(data);
    setSelectedId((current) => current ?? data.requests[0]?.id ?? null);
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => subscribeToDeliveryUpdates({
    onData(data) {
      setDeliveries(data);
      getCoordinatorOverview().then(setOverview).catch(() => {});
    },
    onConnectionChange: setConnection,
  }), []);

  useEffect(() => {
    if (!overview || !selectedId) return;
    const request = overview.requests.find((entry) => entry.id === selectedId);
    if (!request || !overview.depots.length) return;
    const nearest = [...overview.depots].sort((a, b) =>
      ((a.lat - request.lat) ** 2 + (a.lng - request.lng) ** 2) - ((b.lat - request.lat) ** 2 + (b.lng - request.lng) ** 2))[0];
    getRoute(nearest.id, request.id).then(setRoute).catch(() => setRoute(null));
  }, [overview, selectedId]);

  async function skipTime() {
    setSkipping(true);
    setError("");
    try {
      await advanceTime(6);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSkipping(false);
    }
  }

  if (loading) return <p className="p-6 text-mute">Loading dashboard...</p>;
  if (!overview) return <p role="alert" className="p-6 text-crit">{error || "Dashboard is unavailable."}</p>;

  const { dashboard, requests, depots } = overview;
  const liveDashboard = {
    ...dashboard,
    deliveriesInProgress: deliveries.filter((delivery) => delivery.status === "in_transit").length,
    completedDeliveries: deliveries.filter((delivery) => delivery.status === "delivered").length,
  };
  const selected = requests.find((request) => request.id === selectedId);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">Phase 3 · Operations overview</p>
            <h1 className="mt-1 text-3xl font-extrabold">Relief dashboard</h1>
            <p className="mt-1 text-sm text-mute">Monitor needs, shortages and request progress across Sindh.</p>
          </div>
          <button className="btn-lime" onClick={skipTime} disabled={skipping}>{skipping ? "Advancing..." : "Skip +6 hours"}</button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{error}</p>}
        {connection.paused && <p role="alert" className="mb-4 rounded-ui border border-wait bg-wait/10 px-4 py-3 text-sm">Live updates paused. Retrying automatically every 2 seconds.</p>}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active requests" value={liveDashboard.activeRequests} note="Awaiting full delivery" tone="danger" />
          <KpiCard label="People awaiting help" value={liveDashboard.peopleAwaiting} note="Across all active areas" />
          <KpiCard label="Deliveries in progress" value={liveDashboard.deliveriesInProgress} note="Currently on the road" />
          <KpiCard label="Completed deliveries" value={liveDashboard.completedDeliveries} note="Confirmed arrivals" tone="success" />
        </div>

        <div className="mb-4"><Pipeline requests={requests} /></div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-lg font-bold">Affected locations</h2>
                <p className="text-sm text-mute">Select a marker to inspect the request.</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {LEGEND.map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>)}
              </div>
            </div>
            <div className="border-b border-line p-3"><LayerSwitch value={heatLayer} onChange={setHeatLayer} /></div>
            <div className="h-[520px]">
              <MapView requests={requests} depots={depots} selectedId={selectedId} onSelect={setSelectedId}>
                <HeatLayer requests={requests} layer={heatLayer} />
                <RouteLayer routes={route ? [route] : []} selectedId={selectedId} />
                <TruckLayer deliveries={deliveries} />
              </MapView>
            </div>
          </section>

          <aside className="space-y-4">
            {selected && (
              <section className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-mute">Request detail</p>
                    <h2 className="mt-1 text-2xl font-bold">{selected.area}</h2>
                  </div>
                  <StatusBadge request={selected} />
                </div>
                <p className="mt-2 text-sm text-mute">{selected.population.toLocaleString()} people · waiting {selected.hoursWaiting} hours</p>
                <p className="my-4 text-sm">Priority score <strong>{selected.score.total}/100</strong></p>
                <ScoreBars score={selected.score} />
                <ul className="mt-4 divide-y divide-line rounded-ui border border-line">
                  {selected.items.map((item) => (
                    <li key={item.item} className="flex justify-between px-3 py-2 text-sm">
                      <span>{ITEM_LABEL[item.item]}</span>
                      <strong>{item.qtyAllocated} / {item.qtyNeeded}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="panel p-5">
              <h2 className="text-lg font-bold">Critical shortages</h2>
              {!dashboard.criticalShortages.length ? <p className="mt-3 text-sm text-mute">No critical shortage detected.</p> : (
                <ul className="mt-3 space-y-3">
                  {dashboard.criticalShortages.map((shortage) => (
                    <li key={shortage.item} className="rounded-ui bg-paper p-3 text-sm">
                      <div className="flex justify-between gap-3"><strong>{ITEM_LABEL[shortage.item]}</strong><span className="font-semibold text-crit">Gap {shortage.gap.toLocaleString()}</span></div>
                      <p className="mt-1 text-xs text-mute">{shortage.available.toLocaleString()} available · {shortage.needed.toLocaleString()} needed</p>
                    </li>
                  ))}
                </ul>
              )}
              {!!dashboard.lowStockAlerts.length && (
                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="font-bold">Low-stock alerts</h3>
                  {dashboard.lowStockAlerts.map((alert) => (
                    <p key={`${alert.depotId}-${alert.item}`} className="mt-2 text-sm text-crit">
                      {alert.depotName}: {ITEM_LABEL[alert.item]} {alert.qty}/{alert.lowThreshold}
                    </p>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
