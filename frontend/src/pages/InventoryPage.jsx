import { useEffect, useState } from "react";
import DepotCard from "../components/DepotCard.jsx";
import DepotSetupForm from "../components/DepotSetupForm.jsx";
import StockLog from "../components/StockLog.jsx";
import {
  addDepotVehicle, createDepot, getDepots, getStockLog, patchDepot, patchDepotInventory,
  removeDepotVehicle, updateDepotVehicle,
} from "../lib/api.js";
import { useLang } from "../lib/i18n.jsx";

export default function InventoryPage() {
  const { t, num, place, text } = useLang();
  const [depots, setDepots] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Messages are { key, params } or { message } so they re-translate when the language changes.
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  const showMessage = (entry) => (entry.key ? t(entry.key, entry.params) : text(entry.message));

  useEffect(() => {
    getDepots()
      .then((data) => {
        setDepots(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((requestError) => setError({ message: requestError.message }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getStockLog(selectedId)
      .then(setEntries)
      .catch((requestError) => setError({ message: requestError.message }));
  }, [selectedId]);

  const selectedDepot = depots.find((depot) => depot.id === selectedId);
  const totalUnits = depots.reduce((total, depot) => total + depot.stock.reduce((sum, item) => sum + item.qty, 0), 0);
  const lowStockItems = depots.reduce((total, depot) => total + depot.stock.filter((item) => item.isLow).length, 0);

  function replaceDepot(updatedDepot) {
    setDepots((current) => current.map((depot) => depot.id === updatedDepot.id ? updatedDepot : depot));
  }

  async function adjustInventory(body) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updatedDepot = await patchDepotInventory(selectedId, body);
      replaceDepot(updatedDepot);
      setEntries(await getStockLog(selectedId));
      setNotice({ key: "inv.noticeStock" });
      return true;
    } catch (requestError) {
      setError(requestError.code === "INSUFFICIENT_STOCK"
        ? { key: "inv.errCannotRemove", params: { detail: text(requestError.message) } }
        : { message: requestError.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function updateCapacity(dailyCapacity) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      replaceDepot(await patchDepot(selectedId, { dailyCapacity }));
      setNotice({ key: "inv.noticeCapacity" });
      return true;
    } catch (requestError) {
      setError({ message: requestError.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeVehicle(action, successKey) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      replaceDepot(await action());
      setNotice({ key: successKey });
      return true;
    } catch (requestError) {
      setError({ message: requestError.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setupDepot(body) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const depot = await createDepot(body);
      setDepots((current) => [...current, depot]);
      setSelectedId(depot.id);
      setEntries([]);
      setShowSetup(false);
      setNotice({ key: "inv.noticeDepotAdded", params: { name: place(depot.name) } });
      return true;
    } catch (requestError) {
      setError({ message: requestError.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-6 text-mute">{t("inv.loading")}</p>;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("inv.eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{t("inv.title")}</h1>
            <p className="mt-1 text-sm text-mute">{t("inv.subtitle")}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-ui border border-line bg-card px-3 py-2">{t("inv.totalUnits", { n: num(totalUnits) })}</span>
            <span className={`rounded-ui border px-3 py-2 ${lowStockItems ? "border-crit/30 bg-crit/10 text-crit" : "border-line bg-card"}`}>
              {t("inv.lowAlerts", { n: num(lowStockItems) })}
            </span>
            {!!depots.length && <button type="button" className="btn-primary" onClick={() => { setShowSetup(true); setError(null); setNotice(null); }}>{t("inv.newDepot")}</button>}
          </div>
        </div>

        {showSetup || !depots.length ? (
          <div className="mb-4"><DepotSetupForm busy={busy} onCreate={setupDepot} onCancel={depots.length ? () => setShowSetup(false) : undefined} /></div>
        ) : null}

        {!!depots.length && !showSetup && <div className="mb-4 grid gap-3 md:grid-cols-3">
          {depots.map((depot) => {
            const lows = depot.stock.filter((item) => item.isLow).length;
            return (
              <button key={depot.id} type="button" onClick={() => { setSelectedId(depot.id); setError(null); setNotice(null); }}
                className={`panel p-4 text-start transition-colors ${selectedId === depot.id ? "border-ink bg-lime/30" : "hover:bg-paper"}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">{place(depot.name)}</span>
                  {lows > 0 && <span className="rounded bg-crit/10 px-2 py-0.5 text-xs font-semibold text-crit">{t("inv.lowBadge", { n: num(lows) })}</span>}
                </div>
                <p className="mt-2 text-sm text-mute">{t("inv.depotLine", { cap: num(depot.dailyCapacity), v: num(depot.vehicles.length) })}</p>
              </button>
            );
          })}
        </div>}

        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{showMessage(error)}</p>}
        {notice && <p role="status" className="mb-4 rounded-ui border border-done/20 bg-done/10 px-4 py-3 text-sm text-done">{showMessage(notice)}</p>}

        {!!depots.length && !showSetup && selectedDepot && (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <DepotCard depot={selectedDepot} busy={busy} onAdjust={adjustInventory} onCapacity={updateCapacity}
              onAddVehicle={(body) => changeVehicle(() => addDepotVehicle(selectedId, body), "inv.noticeVehicleAdded")}
              onVehicleStatus={(vehicleId, status) => changeVehicle(() => updateDepotVehicle(selectedId, vehicleId, { status }), "inv.noticeVehicleStatus")}
              onRemoveVehicle={(vehicleId) => changeVehicle(() => removeDepotVehicle(selectedId, vehicleId), "inv.noticeVehicleRemoved")} />
            <StockLog entries={entries} />
          </div>
        )}
      </div>
    </div>
  );
}
