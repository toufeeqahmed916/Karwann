import { useState } from "react";
import { ITEMS } from "../lib/constants.js";
import { useLang } from "../lib/i18n.jsx";
import MapView from "./MapView.jsx";

function emptyInventory() {
  return Object.fromEntries(ITEMS.map((item) => [item, { qty: "", lowThreshold: "" }]));
}

export default function DepotSetupForm({ busy, onCreate, onCancel }) {
  const { t, itemName } = useLang();
  const truckName = (n) => t("setup.truckDefault", { n });
  const [depot, setDepot] = useState({ name: "", lat: "", lng: "", dailyCapacity: "" });
  const [inventory, setInventory] = useState(emptyInventory);
  const [trucks, setTrucks] = useState([{ name: truckName(1), capacity: "" }]);
  const latitude = Number(depot.lat);
  const longitude = Number(depot.lng);
  const locationPin = depot.lat !== "" && depot.lng !== "" && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { lat: latitude, lng: longitude }
    : null;

  function pickLocation(location) {
    setDepot((current) => ({
      ...current,
      lat: String(location.lat),
      lng: String(location.lng),
    }));
  }

  function updateInventory(item, field, value) {
    setInventory((current) => ({
      ...current,
      [item]: { ...current[item], [field]: value },
    }));
  }

  function updateTruck(index, field, value) {
    setTrucks((current) => current.map((truck, truckIndex) => (
      truckIndex === index ? { ...truck, [field]: value } : truck
    )));
  }

  function addTruck() {
    setTrucks((current) => [...current, { name: truckName(current.length + 1), capacity: "" }]);
  }

  function removeTruck(index) {
    setTrucks((current) => current.filter((_, truckIndex) => truckIndex !== index));
  }

  async function submit(event) {
    event.preventDefault();
    await onCreate({
      name: depot.name,
      lat: Number(depot.lat),
      lng: Number(depot.lng),
      dailyCapacity: Number(depot.dailyCapacity),
      inventory: ITEMS.map((item) => ({
        item,
        qty: Number(inventory[item].qty),
        lowThreshold: Number(inventory[item].lowThreshold),
      })),
      vehicles: trucks.map((truck) => ({ name: truck.name, capacity: Number(truck.capacity) })),
    });
  }

  return (
    <form className="panel overflow-hidden" onSubmit={submit}>
      <div className="border-b border-line p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("setup.eyebrow")}</p>
        <h2 className="mt-1 text-2xl font-bold">{t("setup.title")}</h2>
        <p className="mt-1 text-sm text-mute">{t("setup.subtitle")}</p>
      </div>

      <div className="p-5">
        <h3 className="font-bold">{t("setup.details")}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm sm:col-span-2">
            {t("setup.depotName")}
            <input className="field mt-1" required placeholder={t("setup.depotNamePlaceholder")} value={depot.name}
              onChange={(event) => setDepot((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="text-sm">
            {t("setup.latitude")}
            <input className="field mt-1" dir="ltr" type="number" min="-90" max="90" step="any" required placeholder="25.3960" value={depot.lat}
              onChange={(event) => setDepot((current) => ({ ...current, lat: event.target.value }))} />
          </label>
          <label className="text-sm">
            {t("setup.longitude")}
            <input className="field mt-1" dir="ltr" type="number" min="-180" max="180" step="any" required placeholder="68.3578" value={depot.lng}
              onChange={(event) => setDepot((current) => ({ ...current, lng: event.target.value }))} />
          </label>
          <label className="text-sm sm:col-span-2">
            {t("setup.dailyCapacity")}
            <input className="field mt-1" type="number" min="0" step="1" required placeholder="2000" value={depot.dailyCapacity}
              onChange={(event) => setDepot((current) => ({ ...current, dailyCapacity: event.target.value }))} />
          </label>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">{t("setup.location")}</h4>
              <p className="text-xs text-mute">{t("setup.locationHelp")}</p>
            </div>
            {locationPin && (
              <span dir="ltr" className="rounded-ui bg-paper px-3 py-1.5 text-xs font-semibold">
                {locationPin.lat.toFixed(4)}, {locationPin.lng.toFixed(4)}
              </span>
            )}
          </div>
          <div className="h-[300px] overflow-hidden rounded-panel border border-line">
            <MapView pin={locationPin} onPick={pickLocation} />
          </div>
        </div>
      </div>

      <div className="border-t border-line p-5">
        <h3 className="font-bold">{t("setup.items")}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {ITEMS.map((item) => (
            <fieldset key={item} className="rounded-panel border border-line p-4">
              <legend className="px-1 font-semibold">{itemName(item)}</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  {t("setup.quantity")}
                  <input className="field mt-1" type="number" min="0" step="1" required value={inventory[item].qty}
                    onChange={(event) => updateInventory(item, "qty", event.target.value)} />
                </label>
                <label className="text-sm">
                  {t("setup.lowAlert")}
                  <input className="field mt-1" type="number" min="0" step="1" required value={inventory[item].lowThreshold}
                    onChange={(event) => updateInventory(item, "lowThreshold", event.target.value)} />
                </label>
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="border-t border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">{t("setup.trucks")}</h3>
            <p className="mt-1 text-sm text-mute">{t("setup.trucksHelp")}</p>
          </div>
          <button type="button" className="btn-lime px-3" onClick={addTruck} disabled={busy || trucks.length >= 20}>{t("setup.addTruck")}</button>
        </div>

        <div className="mt-4 space-y-3">
          {trucks.map((truck, index) => (
            <div key={index} className="grid gap-3 rounded-panel border border-line bg-paper p-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <label className="text-sm">
                {t("setup.truckName")}
                <input className="field mt-1" required value={truck.name}
                  onChange={(event) => updateTruck(index, "name", event.target.value)} />
              </label>
              <label className="text-sm">
                {t("setup.capacity")}
                <input className="field mt-1" type="number" min="1" step="1" required value={truck.capacity}
                  onChange={(event) => updateTruck(index, "capacity", event.target.value)} />
              </label>
              <button type="button" className="btn-ghost px-3 text-crit" onClick={() => removeTruck(index)} disabled={busy || trucks.length === 1}>{t("common.remove")}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line bg-paper p-5">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>{t("common.cancel")}</button>}
        <button className="btn-primary" disabled={busy}>{busy ? t("setup.creating") : t("setup.create")}</button>
      </div>
    </form>
  );
}
