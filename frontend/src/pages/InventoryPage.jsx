import { useEffect, useState } from "react";
import DepotCard from "../components/DepotCard.jsx";
import DepotSetupForm from "../components/DepotSetupForm.jsx";
import StockLog from "../components/StockLog.jsx";
import {
  addDepotVehicle, createDepot, getDepots, getStockLog, patchDepot, patchDepotInventory,
  removeDepotVehicle, updateDepotVehicle,
} from "../lib/api.js";

export default function InventoryPage() {
  const [depots, setDepots] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    getDepots()
      .then((data) => {
        setDepots(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getStockLog(selectedId)
      .then(setEntries)
      .catch((requestError) => setError(requestError.message));
  }, [selectedId]);

  const selectedDepot = depots.find((depot) => depot.id === selectedId);
  const totalUnits = depots.reduce((total, depot) => total + depot.stock.reduce((sum, item) => sum + item.qty, 0), 0);
  const lowStockItems = depots.reduce((total, depot) => total + depot.stock.filter((item) => item.isLow).length, 0);

  function replaceDepot(updatedDepot) {
    setDepots((current) => current.map((depot) => depot.id === updatedDepot.id ? updatedDepot : depot));
  }

  async function adjustInventory(body) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updatedDepot = await patchDepotInventory(selectedId, body);
      replaceDepot(updatedDepot);
      setEntries(await getStockLog(selectedId));
      setNotice("Stock updated and added to the transaction log.");
      return true;
    } catch (requestError) {
      setError(requestError.code === "INSUFFICIENT_STOCK" ? `Cannot remove stock. ${requestError.message}.` : requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function updateCapacity(dailyCapacity) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      replaceDepot(await patchDepot(selectedId, { dailyCapacity }));
      setNotice("Daily capacity updated.");
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeVehicle(action, successMessage) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      replaceDepot(await action());
      setNotice(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setupDepot(body) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const depot = await createDepot(body);
      setDepots((current) => [...current, depot]);
      setSelectedId(depot.id);
      setEntries([]);
      setShowSetup(false);
      setNotice(`${depot.name} inventory and trucks were added.`);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-6 text-mute">Loading inventory...</p>;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">Phase 2 · Live inventory</p>
            <h1 className="mt-1 text-3xl font-extrabold">Depot inventory</h1>
            <p className="mt-1 text-sm text-mute">Update stock, capacity and review available delivery vehicles.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-ui border border-line bg-card px-3 py-2"><strong>{totalUnits.toLocaleString()}</strong> total units</span>
            <span className={`rounded-ui border px-3 py-2 ${lowStockItems ? "border-crit/30 bg-crit/10 text-crit" : "border-line bg-card"}`}>
              <strong>{lowStockItems}</strong> low-stock alerts
            </span>
            {!!depots.length && <button type="button" className="btn-primary" onClick={() => { setShowSetup(true); setError(""); setNotice(""); }}>+ New depot</button>}
          </div>
        </div>

        {showSetup || !depots.length ? (
          <div className="mb-4"><DepotSetupForm busy={busy} onCreate={setupDepot} onCancel={depots.length ? () => setShowSetup(false) : undefined} /></div>
        ) : null}

        {!!depots.length && !showSetup && <div className="mb-4 grid gap-3 md:grid-cols-3">
          {depots.map((depot) => {
            const lows = depot.stock.filter((item) => item.isLow).length;
            return (
              <button key={depot.id} type="button" onClick={() => { setSelectedId(depot.id); setError(""); setNotice(""); }}
                className={`panel p-4 text-left transition-colors ${selectedId === depot.id ? "border-ink bg-lime/30" : "hover:bg-paper"}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">{depot.name}</span>
                  {lows > 0 && <span className="rounded bg-crit/10 px-2 py-0.5 text-xs font-semibold text-crit">{lows} low</span>}
                </div>
                <p className="mt-2 text-sm text-mute">{depot.dailyCapacity.toLocaleString()} units/day · {depot.vehicles.length} vehicles</p>
              </button>
            );
          })}
        </div>}

        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-ui border border-done/20 bg-done/10 px-4 py-3 text-sm text-done">{notice}</p>}

        {!!depots.length && !showSetup && selectedDepot && (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <DepotCard depot={selectedDepot} busy={busy} onAdjust={adjustInventory} onCapacity={updateCapacity}
              onAddVehicle={(body) => changeVehicle(() => addDepotVehicle(selectedId, body), "Vehicle added.")}
              onVehicleStatus={(vehicleId, status) => changeVehicle(() => updateDepotVehicle(selectedId, vehicleId, { status }), "Vehicle status updated.")}
              onRemoveVehicle={(vehicleId) => changeVehicle(() => removeDepotVehicle(selectedId, vehicleId), "Vehicle removed.")} />
            <StockLog entries={entries} />
          </div>
        )}
      </div>
    </div>
  );
}
