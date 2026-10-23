import { useEffect, useRef, useState } from "react";
import { createRequest, getWeights } from "../lib/api.js";
import { aiHealth, analyseAudio, analyseReport } from "../lib/aiApi.js";
import { URGENCY, ACCESS, ITEMS, ITEM_LABEL } from "../lib/constants.js";
import MapView from "../components/MapView.jsx";
import ScoreBars from "../components/ScoreBars.jsx";
import AiReportInput from "../components/AiReportInput.jsx";
import ConfirmRequestCard from "../components/ConfirmRequestCard.jsx";
import ConfidenceBadge from "../components/ConfidenceBadge.jsx";
import { useLanguage } from "../lib/i18n.jsx";

const empty = { area: "", population: "", urgency: "medium", vulnerable: false, accessibility: "easy" };
const WAKING_AFTER_MS = 6000;

export default function RequesterPage() {
  const { lang: language, t, errorText } = useLanguage();
  const [form, setForm] = useState(empty);
  const [pin, setPin] = useState(null);
  const [qty, setQty] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [weights, setWeights] = useState(null);

  // AI report state. Failures never clear `reportText` or the form.
  const [reportText, setReportText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");
  const [ai, setAi] = useState(null); // { result, sourceText } once the AI has filled the form
  const [touched, setTouched] = useState({}); // fields the person edited after the AI draft
  const lastAttempt = useRef(null);

  const selectedSupplies = ITEMS
    .filter((item) => Number(qty[item]) > 0)
    .map((item) => ({ item, quantity: Number(qty[item]) }));
  const totalSelectedUnits = selectedSupplies.reduce((total, entry) => total + entry.quantity, 0);

  useEffect(() => {
    getWeights().then(setWeights).catch(() => {});
    aiHealth().catch(() => {}); // wake a sleeping AI host early; the manual form never depends on it
  }, []);

  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); touch(k); };

  function applyResult(result, sourceText) {
    setForm({
      area: result.area ?? "",
      population: result.people ?? "",
      urgency: result.urgency ?? "medium",
      vulnerable: result.vulnerable.length > 0,
      accessibility: result.access ?? "easy",
    });
    const next = {};
    result.supplies.forEach((s) => { if (s.qty > 0) next[s.item] = String(s.qty); });
    setQty(next);
    setTouched({});
    setErrors({});
    setAi({ result, sourceText });
  }

  async function runAnalysis(attempt) {
    lastAttempt.current = attempt;
    setAiBusy(true);
    setAiError("");
    setAiStatus(attempt.kind === "audio" ? t("report.statusUploading") : t("report.statusAnalysing"));
    const waking = setTimeout(() => setAiStatus(t("report.statusWaking")), WAKING_AFTER_MS);
    try {
      const result = attempt.kind === "audio"
        ? await analyseAudio({ blob: attempt.blob, uiLanguage: language })
        : await analyseReport({ text: attempt.text, uiLanguage: language });
      applyResult(result, attempt.kind === "audio" ? "" : attempt.text);
      setAiStatus(t("report.statusDone"));
    } catch (e) {
      setAiError(errorText(e));
      setAiStatus("");
    } finally {
      clearTimeout(waking);
      setAiBusy(false);
    }
  }

  const analyseText = () => runAnalysis({ kind: "text", text: reportText.trim() });
  const analyseRecording = (blob) => runAnalysis({ kind: "audio", blob });
  const retry = () => lastAttempt.current && runAnalysis(lastAttempt.current);

  function validate() {
    const e = {};
    if (!form.area.trim()) e.area = "Enter the area name";
    if (!pin) e.pin = "Click the map to drop a pin";
    if (!(+form.population > 0)) e.population = "Population must be greater than 0";
    if (!ITEMS.some((i) => +qty[i] > 0)) e.items = "Add a quantity for at least one supply";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // Only operational fields go to Express. AI confidence / raw text are never sent.
      const body = {
        area: form.area.trim(), ...pin, population: +form.population, urgency: form.urgency,
        vulnerable: form.vulnerable, accessibility: form.accessibility,
        items: ITEMS.filter((i) => +qty[i] > 0).map((i) => ({ item: i, qtyNeeded: +qty[i] })),
      };
      setCreated(await createRequest(body));
    } catch (e) {
      setErrors({ form: e.message });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCreated(null); setForm(empty); setPin(null); setQty({});
    setAi(null); setTouched({}); setReportText(""); setAiError(""); setAiStatus("");
  }

  if (created)
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="panel space-y-4 p-6">
          <h2 className="text-2xl font-bold">Request sent for {created.area}</h2>
          <p className="text-sm text-mute">Status: Pending. Your priority score is {created.score.total} out of 100.</p>
          <ScoreBars score={created.score} weights={weights} />
          <button className="btn-primary" onClick={reset}>Send another request</button>
        </div>
      </div>
    );

  // Badge shown beside an AI-filled field; becomes "Edited by you" once the person changes it.
  const badge = (key, confKey, extra = {}) => ai && (
    <div className="mt-1"><ConfidenceBadge value={ai.result.confidence[confKey]} edited={!!touched[key]} {...extra} /></div>
  );

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[420px_1fr] lg:overflow-hidden">
      <div className="space-y-4 lg:overflow-y-auto">
        <AiReportInput
          text={reportText} onText={setReportText}
          onAnalyse={analyseText} onRecorded={analyseRecording}
          onMicError={(message) => { setAiError(message); setAiStatus(""); lastAttempt.current = null; }}
          busy={aiBusy} status={aiStatus} error={aiError} canRetry={!!lastAttempt.current} onRetry={retry}
        />
        {ai && <ConfirmRequestCard result={ai.result} sourceText={ai.sourceText} hasPin={!!pin} />}

        <form id="manual-form" onSubmit={submit} noValidate className="panel space-y-4 p-5">
          <h2 className="text-2xl font-bold">Ask for relief supplies</h2>
          <div>
            <label className="label" htmlFor="area">Area name</label>
            <input id="area" className="field" value={form.area} onChange={(e) => set("area", e.target.value)} />
            {badge("area", "area")}
            {errors.area && <p className="err">{errors.area}</p>}
          </div>
          <div>
            <span className="label">Location</span>
            <p className="text-sm text-mute">{pin ? `Pin at ${pin.lat}, ${pin.lng}` : "Click the map to place a pin."}</p>
            {errors.pin && <p className="err">{errors.pin}</p>}
          </div>
          <div>
            <label className="label" htmlFor="pop">People affected</label>
            <input id="pop" type="number" min="1" className="field" value={form.population} onChange={(e) => set("population", e.target.value)} />
            {badge("population", "people", { estimate: ai?.result.peopleIsEstimate && ai.result.people != null && !touched.population })}
            {errors.population && <p className="err">{errors.population}</p>}
          </div>
          <fieldset>
            <legend className="label">Urgency</legend>
            <div className="grid grid-cols-4 gap-2">
              {URGENCY.map((u) => (
                <button type="button" key={u} aria-pressed={form.urgency === u} onClick={() => set("urgency", u)}
                  className={`btn text-xs capitalize border ${form.urgency === u ? "bg-ink text-white border-ink" : "bg-card border-line"}`}>{u}</button>
              ))}
            </div>
            {badge("urgency", "urgency")}
          </fieldset>
          <fieldset>
            <legend className="label">How hard is it to reach?</legend>
            <div className="grid grid-cols-3 gap-2">
              {ACCESS.map((a) => (
                <button type="button" key={a} aria-pressed={form.accessibility === a} onClick={() => set("accessibility", a)}
                  className={`btn text-xs capitalize border ${form.accessibility === a ? "bg-ink text-white border-ink" : "bg-card border-line"}`}>{a}</button>
              ))}
            </div>
            {badge("accessibility", "access")}
          </fieldset>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.vulnerable} onChange={(e) => set("vulnerable", e.target.checked)} className="accent-ink" />
              Children, elderly or medical patients are among those affected
            </label>
            {badge("vulnerable", "vulnerable")}
          </div>
          <fieldset>
            <legend className="label">Supplies needed</legend>
            <div className="grid grid-cols-2 gap-3">
              {ITEMS.map((i) => (
                <label key={i} className="text-sm">
                  {ITEM_LABEL[i]}
                  <input type="number" min="0" className="field mt-1" value={qty[i] ?? ""}
                    onChange={(e) => { setQty((q) => ({ ...q, [i]: e.target.value })); touch("supplies"); }} />
                </label>
              ))}
            </div>
            {badge("supplies", "supplies")}
            <div className="mt-3 rounded-panel border border-line bg-paper p-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">Selected supplies</span>
                <strong>{totalSelectedUnits.toLocaleString()} total units</strong>
              </div>
              {selectedSupplies.length ? (
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-mute">
                  {selectedSupplies.map(({ item, quantity }) => (
                    <li key={item} className="flex justify-between gap-2">
                      <span>{ITEM_LABEL[item]}</span>
                      <strong className="text-ink">{quantity.toLocaleString()}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-mute">No supplies selected yet.</p>
              )}
            </div>
            {errors.items && <p className="err">{errors.items}</p>}
          </fieldset>
          {errors.form && <p role="alert" className="err">{errors.form}</p>}
          <button className="btn-lime w-full" disabled={saving}>
            {saving ? "Sending..." : ai ? t("confirm.button") : t("confirm.send")}
          </button>
        </form>
      </div>
      <MapView pin={pin} onPick={setPin} height="min(520px, 60vh)" />
    </div>
  );
}
