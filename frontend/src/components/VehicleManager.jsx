import { useState } from "react";
import { useLang } from "../lib/i18n.jsx";

export default function VehicleManager({ vehicles, busy, onAdd, onStatus, onRemove }) {
  const { t, num, place } = useLang();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "" });

  async function submit(event) {
    event.preventDefault();
    const saved = await onAdd({ name: form.name, capacity: Number(form.capacity) });
    if (saved) {
      setForm({ name: "", capacity: "" });
      setAdding(false);
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">{t("vehicles.title")}</h3>
          <p className="mt-1 text-sm text-mute">{t("vehicles.subtitle")}</p>
        </div>
        <button type="button" className="btn-lime px-3" onClick={() => setAdding((value) => !value)}>
          {adding ? t("common.cancel") : t("vehicles.add")}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="mt-4 grid gap-2 rounded-panel border border-line bg-paper p-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <label className="text-sm">
            {t("vehicles.name")}
            <input className="field mt-1" required placeholder={t("vehicles.namePlaceholder")} value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="text-sm">
            {t("vehicles.capacity")}
            <input className="field mt-1" type="number" min="1" step="1" required value={form.capacity}
              onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} />
          </label>
          <button className="btn-primary" disabled={busy}>{t("vehicles.addConfirm")}</button>
        </form>
      )}

      {!vehicles.length ? (
        <p className="mt-4 rounded-panel border border-dashed border-line p-4 text-sm text-mute">{t("vehicles.empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-panel border border-line">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_130px_auto] sm:items-center">
              <span>
                <strong className="block">{place(vehicle.name)}</strong>
                <span className="text-sm text-mute">{t("vehicles.perTrip", { n: num(vehicle.capacity) })}</span>
              </span>
              <select className="field" aria-label={t("vehicles.statusAria", { name: place(vehicle.name) })} value={vehicle.status}
                onChange={(event) => onStatus(vehicle.id, event.target.value)} disabled={busy}>
                <option value="available">{t("vehicles.available")}</option>
                <option value="busy">{t("vehicles.busy")}</option>
              </select>
              <button type="button" className="btn-ghost px-3 text-crit" onClick={() => onRemove(vehicle.id)} disabled={busy}>{t("common.remove")}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
