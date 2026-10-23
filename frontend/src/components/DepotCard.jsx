import { useEffect, useState } from "react";
import { ITEM_LABEL } from "../lib/constants.js";
import VehicleManager from "./VehicleManager.jsx";

const EMPTY_ADJUSTMENT = { item: "", direction: 1, amount: "", reason: "" };

export default function DepotCard({ depot, busy, onAdjust, onCapacity, onAddVehicle, onVehicleStatus, onRemoveVehicle }) {
  const [capacity, setCapacity] = useState(String(depot.dailyCapacity));
  const [adjustment, setAdjustment] = useState(EMPTY_ADJUSTMENT);

  useEffect(() => setCapacity(String(depot.dailyCapacity)), [depot.dailyCapacity]);

  const availableVehicles = depot.vehicles.filter((vehicle) => vehicle.status === "available").length;
  const lowStockCount = depot.stock.filter((stock) => stock.isLow).length;

  function openAdjustment(item, direction) {
    setAdjustment({ item, direction, amount: "", reason: "" });
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    const amount = Number(adjustment.amount);
    if (!Number.isInteger(amount) || amount < 1 || !adjustment.reason.trim()) return;
    const saved = await onAdjust({
      item: adjustment.item,
      change: amount * adjustment.direction,
      reason: adjustment.reason,
    });
    if (saved) setAdjustment(EMPTY_ADJUSTMENT);
  }

  async function saveCapacity(event) {
    event.preventDefault();
    await onCapacity(Number(capacity));
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">Active depot</p>
          <h2 className="mt-1 text-2xl font-bold">{depot.name}</h2>
          <p className="mt-1 text-sm text-mute">{availableVehicles} of {depot.vehicles.length} vehicles available</p>
        </div>
        {lowStockCount > 0 && (
          <span className="rounded-ui bg-crit/10 px-3 py-1.5 text-sm font-semibold text-crit">
            {lowStockCount} low-stock {lowStockCount === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Current stock</h3>
          <span className="text-xs text-mute">Low when below threshold</span>
        </div>
        <div className="divide-y divide-line rounded-panel border border-line">
          {depot.stock.map((stock) => (
            <div key={stock.item} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{ITEM_LABEL[stock.item]}</span>
                  {stock.isLow && <span className="rounded bg-crit/10 px-2 py-0.5 text-xs font-semibold text-crit">Low stock</span>}
                </div>
                <p className="mt-1 text-sm text-mute">
                  <strong className="text-ink">{stock.qty.toLocaleString()}</strong> units · alert below {stock.lowThreshold}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost px-3" onClick={() => openAdjustment(stock.item, -1)}>- Remove</button>
                <button type="button" className="btn-lime px-3" onClick={() => openAdjustment(stock.item, 1)}>+ Restock</button>
              </div>
            </div>
          ))}
        </div>

        {adjustment.item && (
          <form onSubmit={submitAdjustment} className="mt-4 rounded-panel border border-line bg-paper p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold">
                {adjustment.direction > 0 ? "Restock" : "Remove"} {ITEM_LABEL[adjustment.item]}
              </h3>
              <button type="button" className="text-sm font-semibold text-mute hover:text-ink" onClick={() => setAdjustment(EMPTY_ADJUSTMENT)}>Cancel</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
              <label className="text-sm">
                Quantity
                <input className="field mt-1" type="number" min="1" step="1" required value={adjustment.amount}
                  onChange={(event) => setAdjustment((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label className="text-sm">
                Reason
                <input className="field mt-1" required placeholder="e.g. donation received" value={adjustment.reason}
                  onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))} />
              </label>
              <button className="btn-primary" disabled={busy}>Save change</button>
            </div>
          </form>
        )}
      </div>

      <div className="border-t border-line">
        <form onSubmit={saveCapacity} className="border-b border-line p-5">
          <h3 className="font-bold">Daily delivery capacity</h3>
          <p className="mt-1 text-sm text-mute">Maximum units this depot can send per day.</p>
          <div className="mt-3 flex gap-2">
            <input className="field" type="number" min="0" step="1" required value={capacity}
              onChange={(event) => setCapacity(event.target.value)} />
            <button className="btn-ghost whitespace-nowrap" disabled={busy || Number(capacity) === depot.dailyCapacity}>Save</button>
          </div>
        </form>

        <VehicleManager vehicles={depot.vehicles} busy={busy} onAdd={onAddVehicle}
          onStatus={onVehicleStatus} onRemove={onRemoveVehicle} />
      </div>
    </section>
  );
}
