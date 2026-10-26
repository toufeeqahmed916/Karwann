import { useEffect, useState } from "react";
import AllocationTable from "../components/AllocationTable.jsx";
import BaselineCard from "../components/BaselineCard.jsx";
import MapView from "../components/MapView.jsx";
import RouteLayer from "../components/RouteLayer.jsx";
import {
  approveAllocation, generateAllocation, getAllocation, getCoordinatorOverview, getRoute,
} from "../lib/api.js";
import { useLang } from "../lib/i18n.jsx";

export default function AllocationPage() {
  const { t, num, place, text, itemName } = useLang();
  const [plan, setPlan] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  // Messages are stored as { key, params } or { message } so they re-translate if the language changes.
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [route, setRoute] = useState(null);

  const showMessage = (entry) => (entry.key ? t(entry.key, entry.params) : text(entry.message));

  useEffect(() => {
    Promise.all([getCoordinatorOverview(), getAllocation()])
      .then(([overviewData, savedRows]) => {
        setOverview(overviewData);
        if (savedRows.length) {
          setPlan({ rows: savedRows, summary: null, baseline: null });
          setSelectedId(savedRows[0].requestId);
        }
      })
      .catch((requestError) => setError({ message: requestError.message }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const row = plan?.rows.find((entry) => entry.requestId === selectedId && entry.depotId);
    if (!row?.depotId || !row.requestId) {
      setRoute(null);
      return;
    }
    getRoute(row.depotId, row.requestId).then(setRoute).catch(() => setRoute(null));
  }, [plan, selectedId]);

  async function generate() {
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await generateAllocation();
      setPlan(result);
      setSelectedId(result.rows[0]?.requestId ?? null);
    } catch (requestError) {
      setError({ message: requestError.message });
    } finally {
      setWorking(false);
    }
  }

  async function approve(body = { all: true }, requestId = null) {
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await approveAllocation(body);
      setPlan((current) => ({
        ...current,
        rows: current.rows.map((row) => (
          !requestId || row.requestId === requestId ? { ...row, status: "approved" } : row
        )),
      }));
      setNotice(requestId
        ? { key: "alloc.noticeOne", params: { n: num(result.approved) } }
        : { key: "alloc.noticeAll", params: { n: num(result.approved) } });
      setOverview(await getCoordinatorOverview());
    } catch (requestError) {
      setError(requestError.code === "INSUFFICIENT_STOCK"
        ? { key: "alloc.errStockChanged" }
        : { message: requestError.message });
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="p-6 text-mute">{t("alloc.loading")}</p>;

  const selectedRows = plan?.rows.filter((row) => row.requestId === selectedId) ?? [];
  const selected = selectedRows.find((row) => row.depotId) ?? selectedRows[0];
  const request = overview?.requests.find((entry) => entry.id === selected?.requestId);
  const depot = overview?.depots.find((entry) => entry.id === selected?.depotId);
  const selectedAllocated = selectedRows.reduce((total, row) => total + row.qty, 0);
  const selectedItems = [...selectedRows.reduce((items, row) => {
    const item = items.get(row.item) ?? { item: row.item, qty: 0, qtyNeeded: 0 };
    item.qty += row.qty;
    item.qtyNeeded = Math.max(item.qtyNeeded, row.qtyNeeded);
    items.set(row.item, item);
    return items;
  }, new Map()).values()];
  const selectedNeeded = selectedItems.reduce((total, item) => total + item.qtyNeeded, 0);
  const selectedDepots = [...new Set(selectedRows.map((row) => row.depotName))];
  const selectedVehicles = [...new Set(selectedRows.map((row) => row.vehicleId).filter(Boolean))];
  const hasPendingRows = plan?.rows.some((row) => row.qty > 0 && row.status !== "approved");
  const selectedRequestPending = selected && plan.rows.some((row) =>
    row.requestId === selected.requestId && row.qty > 0 && row.status !== "approved"
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("alloc.eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{t("alloc.title")}</h1>
            <p className="mt-1 text-sm text-mute">{t("alloc.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={generate} disabled={working}>{plan ? t("alloc.regenerate") : t("alloc.generate")}</button>
            <button className="btn-lime" onClick={() => approve()} disabled={working || !hasPendingRows}>{working ? t("common.working") : hasPendingRows ? t("alloc.approveAll") : t("alloc.approved")}</button>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{showMessage(error)}</p>}
        {notice && <p role="status" className="mb-4 rounded-ui border border-done/20 bg-done/10 px-4 py-3 text-sm text-done">{showMessage(notice)}</p>}
        {working && <p role="status" className="mb-4 rounded-ui border border-line bg-card px-4 py-3 text-sm text-mute">{t("alloc.workingNotice")}</p>}

        {!plan ? (
          <section className="panel flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime text-2xl font-extrabold">↗</span>
            <h2 className="mt-4 text-2xl font-bold">{t("alloc.readyTitle")}</h2>
            <p className="mt-2 max-w-lg text-sm text-mute">{t("alloc.readyBody")}</p>
            <button className="btn-primary mt-5" onClick={generate} disabled={working}>{working ? t("alloc.generating") : t("alloc.generate")}</button>
          </section>
        ) : (
          <>
            {plan.summary && (
              <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_420px]">
                <section className="panel grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                  <div><p className="text-sm text-mute">{t("alloc.overall")}</p><strong className="mt-1 block text-3xl" dir="ltr">{plan.summary.overallFulfilmentPct}%</strong></div>
                  <div><p className="text-sm text-mute">{t("alloc.criticalFulfilment")}</p><strong className="mt-1 block text-3xl" dir="ltr">{plan.summary.criticalFulfilmentPct}%</strong></div>
                  <div><p className="text-sm text-mute">{t("alloc.allocatedUnits")}</p><strong className="mt-1 block text-3xl">{num(plan.summary.totalAllocated)}</strong></div>
                  <div><p className="text-sm text-mute">{t("alloc.neededUnits")}</p><strong className="mt-1 block text-3xl">{num(plan.summary.totalNeeded)}</strong></div>
                </section>
                <BaselineCard summary={plan.summary} baseline={plan.baseline} />
              </div>
            )}

            <section className="panel mb-4 overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-lg font-bold">{t("alloc.recommended")}</h2>
                <p className="mt-1 text-sm text-mute">{t("alloc.recommendedHelp")}</p>
              </div>
              <AllocationTable rows={plan.rows} selectedId={selectedId} onSelect={setSelectedId} />
            </section>

            {selected && (
              <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
                <section className="panel p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("alloc.why")}</p>
                  <h2 className="mt-1 text-xl font-bold">{place(selected.area)}</h2>
                  <p className="mt-1 text-sm text-mute">{selectedDepots.map((name) => (name === "No depot available" ? t("alloc.noDepot") : place(name))).join(t("common.listSeparator"))}</p>
                  <div className="mt-4 space-y-2">
                    {selectedItems.map((item) => (
                      <div key={item.item} className="flex justify-between gap-3 rounded-ui border border-line bg-paper px-3 py-2 text-sm">
                        <span>{itemName(item.item)}</span>
                        <strong>{t("requests.ofTotal", { a: num(item.qty), n: num(item.qtyNeeded) })}</strong>
                      </div>
                    ))}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 rounded-panel bg-paper p-4 text-sm">
                    <div><dt className="text-mute">{t("alloc.truck")}</dt><dd className="font-semibold">{selectedVehicles.map(place).join(t("common.listSeparator")) || t("allocTable.notAssigned")}</dd></div>
                    <div><dt className="text-mute">{t("alloc.remainingNeed")}</dt><dd className="font-semibold">{t("common.unitsValue", { n: num(Math.max(0, selectedNeeded - selectedAllocated)) })}</dd></div>
                    <div><dt className="text-mute">{t("alloc.distance")}</dt><dd className="font-semibold">{selected.distanceKm == null ? t("common.unavailable") : t("common.kmValue", { n: num(selected.distanceKm) })}</dd></div>
                    <div><dt className="text-mute">{t("alloc.eta")}</dt><dd className="font-semibold">{selected.etaMin == null ? t("common.unavailable") : t("common.minValue", { n: num(selected.etaMin) })}</dd></div>
                  </dl>
                  <button
                    type="button"
                    className="btn-lime mt-4 w-full"
                    onClick={() => approve({ requestId: selected.requestId }, selected.requestId)}
                    disabled={working || !selectedRequestPending}
                  >
                    {working ? t("alloc.approving") : selectedRequestPending ? t("alloc.approveThis") : t("alloc.requestApproved")}
                  </button>
                </section>
                <section className="panel overflow-hidden">
                  <div className="border-b border-line px-4 py-3">
                    <h2 className="font-bold">{t("alloc.routePreview")}</h2>
                    <p className="text-xs text-mute">{t("alloc.routeHelp")}</p>
                  </div>
                  <div className="h-[340px]">
                    <MapView requests={request ? [request] : []} depots={depot ? [depot] : []} selectedId={request?.id}>
                      <RouteLayer routes={route ? [route] : []} selectedId={request?.id} />
                    </MapView>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
