import { useEffect, useState } from "react";
import { useLang } from "../lib/i18n.jsx";
import VehicleManager from "./VehicleManager.jsx";

const EMPTY_ADJUSTMENT = { item: "", direction: 1, amount: "", reason: "" };

export default function DepotCard({ depot, busy, onAdjust, onCapacity, onAddVehicle, onVehicleStatus, onRemoveVehicle }) {
  const { t, num, place, itemName } = useLang();
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
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("depot.active")}</p>
          <h2 className="mt-1 text-2xl font-bold">{place(depot.name)}</h2>
          <p className="mt-1 text-sm text-mute">{t("depot.vehiclesAvailable", { a: num(availableVehicles), n: num(depot.vehicles.length) })}</p>
        </div>
        {lowStockCount > 0 && (
          <span className="rounded-ui bg-crit/10 px-3 py-1.5 text-sm font-semibold text-crit">
            {t(lowStockCount === 1 ? "depot.lowStockOne" : "depot.lowStockMany", { n: num(lowStockCount) })}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">{t("depot.currentStock")}</h3>
          <span className="text-xs text-mute">{t("depot.lowWhenBelow")}</span>
        </div>
        <div className="divide-y divide-line rounded-panel border border-line">
          {depot.stock.map((stock) => (
            <div key={stock.item} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{itemName(stock.item)}</span>
                  {stock.isLow && <span className="rounded bg-crit/10 px-2 py-0.5 text-xs font-semibold text-crit">{t("depot.lowStock")}</span>}
                </div>
                <p className="mt-1 text-sm text-mute">
                  {t("depot.stockLine", { qty: num(stock.qty), threshold: num(stock.lowThreshold) })}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost px-3" onClick={() => openAdjustment(stock.item, -1)}>{t("depot.removeStock")}</button>
                <button type="button" className="btn-lime px-3" onClick={() => openAdjustment(stock.item, 1)}>{t("depot.restock")}</button>
              </div>
            </div>
          ))}
        </div>

        {adjustment.item && (
          <form onSubmit={submitAdjustment} className="mt-4 rounded-panel border border-line bg-paper p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold">
                {t(adjustment.direction > 0 ? "depot.restockItem" : "depot.removeItem", { item: itemName(adjustment.item) })}
              </h3>
              <button type="button" className="text-sm font-semibold text-mute hover:text-ink" onClick={() => setAdjustment(EMPTY_ADJUSTMENT)}>{t("common.cancel")}</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
              <label className="text-sm">
                {t("depot.quantity")}
                <input className="field mt-1" type="number" min="1" step="1" required value={adjustment.amount}
                  onChange={(event) => setAdjustment((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label className="text-sm">
                {t("depot.reason")}
                <input className="field mt-1" required placeholder={t("depot.reasonPlaceholder")} value={adjustment.reason}
                  onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))} />
              </label>
              <button className="btn-primary" disabled={busy}>{t("depot.saveChange")}</button>
            </div>
          </form>
        )}
      </div>

      <div className="border-t border-line">
        <form onSubmit={saveCapacity} className="border-b border-line p-5">
          <h3 className="font-bold">{t("depot.capacityTitle")}</h3>
          <p className="mt-1 text-sm text-mute">{t("depot.capacityHelp")}</p>
          <div className="mt-3 flex gap-2">
            <input className="field" type="number" min="0" step="1" required value={capacity}
              onChange={(event) => setCapacity(event.target.value)} />
            <button className="btn-ghost whitespace-nowrap" disabled={busy || Number(capacity) === depot.dailyCapacity}>{t("common.save")}</button>
          </div>
        </form>

        <VehicleManager vehicles={depot.vehicles} busy={busy} onAdd={onAddVehicle}
          onStatus={onVehicleStatus} onRemove={onRemoveVehicle} />
      </div>
    </section>
  );
}
