import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "../components/MapView.jsx";
import RouteLayer from "../components/RouteLayer.jsx";
import TruckLayer from "../components/TruckLayer.jsx";
import { completeDelivery, getCoordinatorOverview, getDeliveries, startDeliveries } from "../lib/api.js";
import { subscribeToDeliveryUpdates } from "../lib/realtime.js";
import { useLang } from "../lib/i18n.jsx";

export default function DriverPage() {
  const { t, num, place, text, itemName, statusName } = useLang();
  const [overview, setOverview] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryId, setDeliveryId] = useState("");
  const knownDeliveryIds = useRef(new Set());
  const [connection, setConnection] = useState({ paused: false, mode: "polling" });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCoordinatorOverview().then(setOverview).catch((requestError) => setError(requestError.message));
    return subscribeToDeliveryUpdates({
      onData(data) {
        const newDeliveries = data.filter((delivery) => !knownDeliveryIds.current.has(delivery.allocationId));
        knownDeliveryIds.current = new Set(data.map((delivery) => delivery.allocationId));
        setDeliveries(data);
        setDeliveryId((current) => {
          if (newDeliveries.length) return newDeliveries.at(-1).allocationId;
          return data.some((delivery) => delivery.allocationId === current)
            ? current
            : data[0]?.allocationId || "";
        });
        setLoading(false);
      },
      onConnectionChange: setConnection,
    });
  }, []);

  const orderedDeliveries = useMemo(() => {
    const statusPriority = { in_transit: 0, approved: 1, delivered: 2 };
    return [...deliveries].sort((left, right) =>
      (statusPriority[left.status] ?? 3) - (statusPriority[right.status] ?? 3) ||
      new Date(right.createdAt ?? 0) - new Date(left.createdAt ?? 0)
    );
  }, [deliveries]);
  const delivery = deliveries.find((entry) => entry.allocationId === deliveryId) || orderedDeliveries[0];
  const request = overview?.requests.find((entry) => entry.id === delivery?.requestId);
  const depot = overview?.depots.find((entry) => entry.id === delivery?.depotId);
  const route = delivery ? {
    depotId: delivery.depotId,
    requestId: delivery.requestId,
    polyline: delivery.route,
    distanceKm: delivery.distanceKm,
    durationMin: delivery.etaMin,
    estimated: true,
  } : null;

  async function refresh() {
    const [nextDeliveries, nextOverview] = await Promise.all([
      getDeliveries(),
      getCoordinatorOverview(),
    ]);
    setDeliveries(nextDeliveries);
    setOverview(nextOverview);
  }

  async function startTrip() {
    setWorking(true);
    setError("");
    try {
      await startDeliveries({ allocationIds: [delivery.allocationId] });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  async function markDelivered() {
    setWorking(true);
    setError("");
    try {
      await completeDelivery(delivery.allocationId);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="p-6 text-mute">{t("driver.loading")}</p>;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("driver.eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{t("driver.title")}</h1>
            <p className="mt-1 text-sm text-mute">{t("driver.subtitle")}</p>
          </div>
          {!!orderedDeliveries.length && (
            <label className="text-sm">{t("driver.assigned")}
              <select className="field mt-1 min-w-56" value={delivery?.allocationId ?? ""} onChange={(event) => setDeliveryId(event.target.value)}>
                {orderedDeliveries.map((entry) => <option key={entry.allocationId} value={entry.allocationId}>{place(entry.area)} · {place(entry.vehicleId)} · {statusName(entry.status)}</option>)}
              </select>
            </label>
          )}
        </div>

        {connection.paused && <p role="alert" className="mb-4 rounded-ui border border-wait bg-wait/10 px-4 py-3 text-sm">{t("common.livePaused")}</p>}
        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{text(error)}</p>}

        {!delivery ? (
          <section className="panel p-8 text-center"><h2 className="text-xl font-bold">{t("driver.noneTitle")}</h2><p className="mt-2 text-sm text-mute">{t("driver.noneBody")}</p></section>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <section className="panel overflow-hidden">
              <div className="border-b border-line p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("driver.destination")}</p><h2 className="mt-1 text-2xl font-bold">{place(delivery.area)}</h2></div>
                  <span className={`rounded-ui px-2 py-1 text-xs font-semibold ${delivery.status === "delivered" ? "bg-done/10 text-done" : delivery.status === "in_transit" ? "bg-transit/10 text-transit" : "bg-paper"}`}>{statusName(delivery.status)}</span>
                </div>
                <p className="mt-2 text-sm text-mute">{t("driver.routeLine", { depot: place(delivery.depotName), km: num(delivery.distanceKm), min: num(delivery.etaMin) })}</p>
              </div>

              <div className="p-5">
                <div className="flex justify-between text-sm"><span className="text-mute">{t("driver.progress")}</span><strong dir="ltr">{delivery.progressPct}%</strong></div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full transition-all ${delivery.status === "delivered" ? "bg-done" : "bg-transit"}`} style={{ width: `${delivery.progressPct}%` }} /></div>
                {delivery.status === "in_transit" && delivery.progressPct >= 96 && (
                  <p role="status" className="mt-3 rounded-ui border border-done/20 bg-done/10 px-3 py-2 text-sm font-semibold text-done">
                    {t("driver.arrivedNotice")}
                  </p>
                )}

                <h3 className="mt-5 font-bold">{t("driver.load")}</h3>
                <ul className="mt-2 divide-y divide-line rounded-ui border border-line">
                  {delivery.items.map((item) => <li key={item.item} className="flex justify-between px-3 py-2 text-sm"><span>{itemName(item.item)}</span><strong>{t("common.unitsValue", { n: num(item.qty) })}</strong></li>)}
                </ul>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <button className="btn-primary w-full" onClick={startTrip} disabled={working || delivery.status !== "approved"}>
                    {delivery.status === "approved" ? t("driver.startTrip") : delivery.status === "in_transit" ? t("driver.tripStarted") : t("driver.tripCompleted")}
                  </button>
                  <button className="btn-lime w-full" onClick={markDelivered} disabled={working || delivery.status !== "in_transit"}>
                    {delivery.status === "delivered" ? t("driver.delivered") : t("driver.markDelivered")}
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-mute">{t("driver.updates", { mode: t(`common.mode.${connection.mode}`) })}</p>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <div className="border-b border-line px-4 py-3"><h2 className="font-bold">{t("driver.mapTitle")}</h2><p className="text-xs text-mute">{t("driver.mapHelp")}</p></div>
              <div className="h-[520px] min-h-[420px]">
                <MapView requests={request ? [request] : []} depots={depot ? [depot] : []} selectedId={request?.id}>
                  <RouteLayer routes={route ? [route] : []} selectedId={request?.id} />
                  <TruckLayer deliveries={[delivery]} />
                </MapView>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
