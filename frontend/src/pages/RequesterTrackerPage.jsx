import { useEffect, useMemo, useState } from "react";
import MapView from "../components/MapView.jsx";
import RouteLayer from "../components/RouteLayer.jsx";
import TruckLayer from "../components/TruckLayer.jsx";
import { getCoordinatorOverview } from "../lib/api.js";
import { subscribeToDeliveryUpdates } from "../lib/realtime.js";
import { useLang } from "../lib/i18n.jsx";

const STEPS = ["tracker.stepReceived", "tracker.stepAllocated", "tracker.stepTransit", "tracker.stepDelivered"];

function stepIndex(status) {
  if (status === "delivered") return 3;
  if (status === "in_transit") return 2;
  if (["approved", "allocated", "recommended"].includes(status)) return 1;
  return 0;
}

export default function RequesterTrackerPage() {
  const { t, num, place, text, itemName } = useLang();
  const [overview, setOverview] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [connection, setConnection] = useState({ paused: false, mode: "polling" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCoordinatorOverview().then(setOverview).catch((requestError) => setError(requestError.message));
    return subscribeToDeliveryUpdates({
      onData(data) {
        setDeliveries(data);
        setSelectedId((current) => current || data[0]?.allocationId || "");
        setLoading(false);
      },
      onConnectionChange: setConnection,
    });
  }, []);

  const delivery = useMemo(() => deliveries.find((entry) => entry.allocationId === selectedId) || deliveries[0], [deliveries, selectedId]);
  const request = overview?.requests.find((entry) => entry.id === delivery?.requestId);
  const depot = overview?.depots.find((entry) => entry.id === delivery?.depotId);
  const route = delivery ? { depotId: delivery.depotId, requestId: delivery.requestId, polyline: delivery.route, distanceKm: delivery.distanceKm, durationMin: delivery.etaMin, estimated: true } : null;
  const activeStep = delivery ? stepIndex(delivery.status) : 0;
  const remainingMinutes = delivery ? Math.max(0, Math.round(delivery.etaMin * (1 - delivery.progressPct / 100))) : 0;

  if (loading) return <p className="p-6 text-mute">{t("tracker.loading")}</p>;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("tracker.eyebrow")}</p><h1 className="mt-1 text-3xl font-extrabold">{t("tracker.title")}</h1><p className="mt-1 text-sm text-mute">{t("tracker.subtitle")}</p></div>
          {deliveries.length > 1 && <select className="field w-auto" aria-label={t("tracker.chooseDelivery")} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{deliveries.map((entry) => <option key={entry.allocationId} value={entry.allocationId}>{place(entry.area)}</option>)}</select>}
        </div>

        {connection.paused && <p role="alert" className="mb-4 rounded-ui border border-wait bg-wait/10 px-4 py-3 text-sm">{t("common.livePaused")}</p>}
        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{text(error)}</p>}

        {!delivery ? (
          <section className="panel p-8 text-center"><h2 className="text-xl font-bold">{t("tracker.noneTitle")}</h2><p className="mt-2 text-sm text-mute">{t("tracker.noneBody")}</p></section>
        ) : (
          <div className="space-y-4">
            <section className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-sm text-mute">{t("tracker.deliveryTo")}</p><h2 className="text-2xl font-bold">{place(delivery.area)}</h2><p className="mt-1 text-sm text-mute">{t("tracker.from", { depot: place(delivery.depotName) })}</p></div>
                <div className="text-end"><p className="text-sm text-mute">{t("tracker.remaining")}</p><strong className="text-2xl">{delivery.status === "delivered" ? t("tracker.arrived") : t("common.minValue", { n: num(remainingMinutes) })}</strong></div>
              </div>
              <ol className="mt-6 grid gap-2 sm:grid-cols-4">
                {STEPS.map((step, index) => <li key={step} className={`rounded-ui border p-3 text-sm font-semibold ${index <= activeStep ? "border-lime-dark bg-lime/25" : "border-line bg-paper text-mute"}`}><span className="me-2">{index < activeStep ? "✓" : num(index + 1)}</span>{t(step)}</li>)}
              </ol>
              <div className="mt-5 flex justify-between text-sm"><span className="text-mute">{t("tracker.progress")}</span><strong dir="ltr">{delivery.progressPct}%</strong></div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full transition-all ${delivery.status === "delivered" ? "bg-done" : "bg-transit"}`} style={{ width: `${delivery.progressPct}%` }} /></div>
              <div className="mt-4 flex flex-wrap gap-2">{delivery.items.map((item) => <span key={item.item} className="rounded-ui bg-paper px-3 py-2 text-sm"><strong>{itemName(item.item)}</strong> · {t("common.unitsValue", { n: num(item.qty) })}</span>)}</div>
            </section>

            <section className="panel overflow-hidden">
              <div className="border-b border-line px-4 py-3"><h2 className="font-bold">{t("tracker.mapTitle")}</h2><p className="text-xs text-mute">{t("tracker.mapSubtitle")}</p></div>
              <div className="h-[460px] min-h-[360px]">
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
