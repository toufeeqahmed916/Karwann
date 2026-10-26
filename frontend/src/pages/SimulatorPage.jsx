import { useEffect, useState } from "react";
import { Circle } from "react-leaflet";
import DiffList from "../components/DiffList.jsx";
import MapView from "../components/MapView.jsx";
import {
  applySimulation, deleteSimulationBlock, getCoordinatorOverview, getSimulationBlocks,
  recalculateSimulation, undoSimulation,
} from "../lib/api.js";
import { ITEMS } from "../lib/constants.js";
import { useLang } from "../lib/i18n.jsx";

const ACTIONS = ["reduce_stock", "add_stock", "increase_population", "add_request", "change_capacity", "block_zone"];

const DEFAULT_FORM = {
  action: "reduce_stock", depotId: "", item: "water", percent: "50", qty: "800",
  requestId: "", dailyCapacity: "800", area: "", population: "1800",
  urgency: "high", qtyNeeded: "300", radiusKm: "15",
};

export default function SimulatorPage() {
  const { t, num, place, text, itemName, urgencyName } = useLang();
  const [overview, setOverview] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM, area: t("sim.defaultArea") }));
  const [pin, setPin] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [noticeKey, setNoticeKey] = useState("");

  async function load() {
    const [overviewData, blockData] = await Promise.all([getCoordinatorOverview(), getSimulationBlocks()]);
    setOverview(overviewData);
    setBlocks(blockData);
    setForm((current) => ({
      ...current,
      depotId: current.depotId || overviewData.depots[0]?.id || "",
      requestId: current.requestId || overviewData.requests[0]?.id || "",
    }));
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function payload() {
    if (form.action === "reduce_stock") return { action: form.action, depotId: form.depotId, item: form.item, percent: Number(form.percent) };
    if (form.action === "add_stock") return { action: form.action, depotId: form.depotId, item: form.item, qty: Number(form.qty) };
    if (form.action === "increase_population") return { action: form.action, requestId: form.requestId, percent: Number(form.percent) };
    if (form.action === "change_capacity") return { action: form.action, depotId: form.depotId, dailyCapacity: Number(form.dailyCapacity) };
    if (form.action === "block_zone") return { action: form.action, lat: pin?.lat, lng: pin?.lng, radiusKm: Number(form.radiusKm) };
    return {
      action: form.action,
      request: {
        area: form.area, population: Number(form.population), urgency: form.urgency,
        lat: 26.3, lng: 68.2, item: form.item, qtyNeeded: Number(form.qtyNeeded),
        accessibility: "medium", vulnerable: false,
      },
    };
  }

  async function recalculate() {
    setWorking(true);
    setError("");
    setNoticeKey("");
    try {
      setResult(await recalculateSimulation(payload()));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  async function apply() {
    setWorking(true);
    setError("");
    try {
      await applySimulation();
      await load();
      setResult(null);
      setPin(null);
      setNoticeKey("sim.noticeApplied");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  async function undo() {
    setWorking(true);
    await undoSimulation();
    setResult(null);
    setPin(null);
    setNoticeKey("sim.noticeUndone");
    setWorking(false);
  }

  async function removeBlock(blockId) {
    await deleteSimulationBlock(blockId);
    setBlocks(await getSimulationBlocks());
  }

  if (loading) return <p className="p-6 text-mute">{t("sim.loading")}</p>;
  if (!overview) return <p role="alert" className="p-6 text-crit">{error ? text(error) : t("sim.unavailable")}</p>;

  const { requests, depots } = overview;
  const changePct = result?.diff.overallChangePct;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("sim.eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-extrabold">{t("sim.title")}</h1>
          <p className="mt-1 text-sm text-mute">{t("sim.subtitle")}</p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-ui border border-crit/20 bg-crit/10 px-4 py-3 text-sm text-crit">{text(error)}</p>}
        {noticeKey && <p role="status" className="mb-4 rounded-ui border border-done/20 bg-done/10 px-4 py-3 text-sm text-done">{t(noticeKey)}</p>}

        <div className="grid items-start gap-4 xl:grid-cols-[410px_minmax(0,1fr)]">
          <section className="panel p-5">
            <label className="label" htmlFor="sim-action">{t("sim.whatChange")}</label>
            <select id="sim-action" className="field" value={form.action} onChange={(event) => { set("action", event.target.value); setResult(null); setPin(null); }}>
              {ACTIONS.map((value) => <option key={value} value={value}>{t(`sim.action.${value}`)}</option>)}
            </select>

            <div className="mt-4 space-y-4">
              {["reduce_stock", "add_stock", "change_capacity"].includes(form.action) && (
                <label className="text-sm">{t("sim.depot")}
                  <select className="field mt-1" value={form.depotId} onChange={(event) => set("depotId", event.target.value)}>
                    {depots.map((depot) => <option key={depot.id} value={depot.id}>{place(depot.name)}</option>)}
                  </select>
                </label>
              )}
              {["reduce_stock", "add_stock", "add_request"].includes(form.action) && (
                <label className="text-sm">{t("sim.supply")}
                  <select className="field mt-1" value={form.item} onChange={(event) => set("item", event.target.value)}>
                    {ITEMS.map((item) => <option key={item} value={item}>{itemName(item)}</option>)}
                  </select>
                </label>
              )}
              {form.action === "increase_population" && (
                <label className="text-sm">{t("sim.request")}
                  <select className="field mt-1" value={form.requestId} onChange={(event) => set("requestId", event.target.value)}>
                    {requests.map((request) => <option key={request.id} value={request.id}>{place(request.area)}</option>)}
                  </select>
                </label>
              )}
              {["reduce_stock", "increase_population"].includes(form.action) && (
                <label className="text-sm">{t("sim.percentage")}
                  <input className="field mt-1" type="number" min="1" max="100" value={form.percent} onChange={(event) => set("percent", event.target.value)} />
                </label>
              )}
              {form.action === "add_stock" && (
                <label className="text-sm">{t("sim.unitsToAdd")}
                  <input className="field mt-1" type="number" min="1" value={form.qty} onChange={(event) => set("qty", event.target.value)} />
                </label>
              )}
              {form.action === "change_capacity" && (
                <label className="text-sm">{t("sim.newCapacity")}
                  <input className="field mt-1" type="number" min="0" value={form.dailyCapacity} onChange={(event) => set("dailyCapacity", event.target.value)} />
                </label>
              )}
              {form.action === "add_request" && (
                <>
                  <label className="text-sm">{t("sim.areaName")}<input className="field mt-1" value={form.area} onChange={(event) => set("area", event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">{t("sim.peopleAffected")}<input className="field mt-1" type="number" min="1" value={form.population} onChange={(event) => set("population", event.target.value)} /></label>
                    <label className="text-sm">{t("sim.unitsNeeded")}<input className="field mt-1" type="number" min="1" value={form.qtyNeeded} onChange={(event) => set("qtyNeeded", event.target.value)} /></label>
                  </div>
                  <label className="text-sm">{t("sim.urgency")}
                    <select className="field mt-1" value={form.urgency} onChange={(event) => set("urgency", event.target.value)}>
                      {["low", "medium", "high", "critical"].map((urgency) => <option key={urgency} value={urgency}>{urgencyName(urgency)}</option>)}
                    </select>
                  </label>
                </>
              )}
              {form.action === "block_zone" && (
                <>
                  <label className="text-sm">{t("sim.radius")}<input className="field mt-1" type="number" min="1" value={form.radiusKm} onChange={(event) => set("radiusKm", event.target.value)} /></label>
                  <p className={`rounded-ui p-3 text-sm ${pin ? "bg-lime/30" : "bg-paper text-mute"}`}>
                    {pin ? <>{t("sim.zoneCentre")} <span dir="ltr">{pin.lat}, {pin.lng}</span></> : t("sim.zoneHint")}
                  </p>
                </>
              )}
            </div>

            <button className="btn-primary mt-5 w-full" onClick={recalculate} disabled={working}>{working ? t("sim.recalculating") : t("sim.recalculate")}</button>

            {!!blocks.length && (
              <div className="mt-5 border-t border-line pt-4">
                <h2 className="font-bold">{t("sim.activeZones")}</h2>
                <ul className="mt-2 space-y-2">
                  {blocks.map((block) => (
                    <li key={block.id} className="flex items-center justify-between rounded-ui bg-paper px-3 py-2 text-sm">
                      <span>{t("common.kmValue", { n: num(block.radiusKm) })} · <span dir="ltr">{block.lat.toFixed(2)}, {block.lng.toFixed(2)}</span></span>
                      <button type="button" className="font-semibold text-crit" onClick={() => removeBlock(block.id)}>{t("common.remove")}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-bold">{t("sim.mapTitle")}</h2>
              <p className="text-sm text-mute">{t("sim.mapHelp")}</p>
            </div>
            <div className="h-[560px]">
              <MapView requests={requests} depots={depots} pin={form.action === "block_zone" ? pin : null}
                onPick={form.action === "block_zone" ? setPin : undefined}>
                {blocks.map((block) => <Circle key={block.id} center={[block.lat, block.lng]} radius={block.radiusKm * 1000}
                  pathOptions={{ color: "#D93636", fillColor: "#D93636", fillOpacity: 0.13, dashArray: "8 6" }} />)}
                {form.action === "block_zone" && pin && <Circle center={[pin.lat, pin.lng]} radius={Number(form.radiusKm || 0) * 1000}
                  pathOptions={{ color: "#EF8A1F", fillColor: "#EF8A1F", fillOpacity: 0.12, dashArray: "6 5" }} />}
              </MapView>
            </div>
          </section>
        </div>

        {result && (
          <div className="mt-4 space-y-4">
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("sim.beforeAfter")}</p>
                  <h2 className="mt-1 text-xl font-bold">{t("sim.impact")}</h2>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={undo} disabled={working}>{t("sim.undo")}</button>
                  <button className="btn-lime" onClick={apply} disabled={working}>{t("sim.apply")}</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-panel bg-paper p-4"><p className="text-sm text-mute">{t("sim.before")}</p><strong className="mt-1 block text-3xl" dir="ltr">{result.before.summary.overallFulfilmentPct}%</strong></div>
                <div className="rounded-panel bg-paper p-4"><p className="text-sm text-mute">{t("sim.after")}</p><strong className="mt-1 block text-3xl" dir="ltr">{result.after.summary.overallFulfilmentPct}%</strong></div>
                <div className={`rounded-panel p-4 ${changePct < 0 ? "bg-crit/10 text-crit" : "bg-done/10 text-done"}`}>
                  <p className="text-sm">{t("sim.overallChange")}</p><strong className="mt-1 block text-3xl" dir="ltr">{changePct > 0 ? "+" : ""}{changePct}%</strong>
                </div>
              </div>
            </section>
            <DiffList requests={result.diff.requests} />
          </div>
        )}
      </div>
    </div>
  );
}
