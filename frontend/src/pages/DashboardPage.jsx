import { useEffect, useRef, useState } from "react";
import KpiCard from "../components/KpiCard.jsx";
import HeatLayer from "../components/HeatLayer.jsx";
import LayerSwitch from "../components/LayerSwitch.jsx";
import MapView from "../components/MapView.jsx";
import Pipeline from "../components/Pipeline.jsx";
import RouteLayer from "../components/RouteLayer.jsx";
import TruckLayer from "../components/TruckLayer.jsx";
import ScoreBars from "../components/ScoreBars.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { getCoordinatorOverview, getRoute } from "../lib/api.js";
import { subscribeToDeliveryUpdates } from "../lib/realtime.js";
import { useLang } from "../lib/i18n.jsx";

const LEGEND = [
  ["#D93636", "legend.critical"], ["#EF8A1F", "legend.high"], ["#E3C21B", "legend.waiting"],
  ["#2F6FDE", "legend.transit"], ["#2E9D5B", "legend.delivered"],
];

export default function DashboardPage() {
  const { t, num, place, text, itemName } = useLang();
  const [overview, setOverview] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heatLayer, setHeatLayer] = useState("need");
  const [route, setRoute] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [connection, setConnection] = useState({ paused: false, mode: "polling" });
  const deliveryState = useRef("");

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
      const nextState = data.map((delivery) => `${delivery.allocationId}:${delivery.status}`).sort().join("|");
      // Progress changes update from the delivery response itself. Reload the
      // heavier overview only when a delivery is added or changes status.
      if (deliveryState.current && deliveryState.current !== nextState) {
        getCoordinatorOverview().then(setOverview).catch(() => {});
      }
      deliveryState.current = nextState;
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

  if (loading) return <p className="p-6 text-mute">{t("dash.loading")}</p>;
  if (!overview) return <p role="alert" className="p-6 text-crit">{error ? text(error) : t("dash.unavailable")}</p>;

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
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("dash.eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{t("dash.title")}</h1>
            <p className="mt-1 text-sm text-mute">{t("dash.subtitle")}</p>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{text(error)}</p>}
        {connection.paused && <p role="alert" className="mb-4 rounded-ui border border-wait bg-wait/10 px-4 py-3 text-sm">{t("common.livePaused")}</p>}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={t("dash.kpiActive")} value={liveDashboard.activeRequests} note={t("dash.kpiActiveNote")} tone="danger" />
          <KpiCard label={t("dash.kpiPeople")} value={liveDashboard.peopleAwaiting} note={t("dash.kpiPeopleNote")} />
          <KpiCard label={t("dash.kpiProgress")} value={liveDashboard.deliveriesInProgress} note={t("dash.kpiProgressNote")} />
          <KpiCard label={t("dash.kpiDone")} value={liveDashboard.completedDeliveries} note={t("dash.kpiDoneNote")} tone="success" />
        </div>

        <div className="mb-4"><Pipeline requests={requests} /></div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-lg font-bold">{t("dash.locations")}</h2>
                <p className="text-sm text-mute">{t("dash.locationsHelp")}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {LEGEND.map(([color, labelKey]) => <span key={labelKey} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{t(labelKey)}</span>)}
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("dash.detail")}</p>
                    <h2 className="mt-1 text-2xl font-bold">{place(selected.area)}</h2>
                  </div>
                  <StatusBadge request={selected} />
                </div>
                <p className="mt-2 text-sm text-mute">{t("dash.peopleWaiting", { n: num(selected.population), h: num(selected.hoursWaiting) })}</p>
                <p className="my-4 text-sm">{t("dash.priorityScore", { score: num(selected.score.total) })}</p>
                <ScoreBars score={selected.score} />
                <ul className="mt-4 divide-y divide-line rounded-ui border border-line">
                  {selected.items.map((item) => (
                    <li key={item.item} className="flex justify-between px-3 py-2 text-sm">
                      <span>{itemName(item.item)}</span>
                      <strong dir="ltr">{num(item.qtyAllocated)} / {num(item.qtyNeeded)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="panel p-5">
              <h2 className="text-lg font-bold">{t("dash.shortages")}</h2>
              {!dashboard.criticalShortages.length ? <p className="mt-3 text-sm text-mute">{t("dash.noShortage")}</p> : (
                <ul className="mt-3 space-y-3">
                  {dashboard.criticalShortages.map((shortage) => (
                    <li key={shortage.item} className="rounded-ui bg-paper p-3 text-sm">
                      <div className="flex justify-between gap-3"><strong>{itemName(shortage.item)}</strong><span className="font-semibold text-crit">{t("dash.gap", { n: num(shortage.gap) })}</span></div>
                      <p className="mt-1 text-xs text-mute">{t("dash.availableNeeded", { a: num(shortage.available), n: num(shortage.needed) })}</p>
                    </li>
                  ))}
                </ul>
              )}
              {!!dashboard.lowStockAlerts.length && (
                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="font-bold">{t("dash.lowStock")}</h3>
                  {dashboard.lowStockAlerts.map((alert) => (
                    <p key={`${alert.depotId}-${alert.item}`} className="mt-2 text-sm text-crit">
                      {place(alert.depotName)}: {itemName(alert.item)} <span dir="ltr">{num(alert.qty)}/{num(alert.lowThreshold)}</span>
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
