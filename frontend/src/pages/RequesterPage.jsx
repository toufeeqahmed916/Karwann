import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createRequest, getWeights } from "../lib/api.js";
import { analyseAudio, analyseReport } from "../lib/aiApi.js";
import { URGENCY, ACCESS, ITEMS } from "../lib/constants.js";
import MapView from "../components/MapView.jsx";
import ScoreBars from "../components/ScoreBars.jsx";
import AiReportInput from "../components/AiReportInput.jsx";
import ConfirmRequestCard from "../components/ConfirmRequestCard.jsx";
import ConfidenceBadge from "../components/ConfidenceBadge.jsx";
import { useLanguage } from "../lib/i18n.jsx";
import { canonicalPlace } from "../lib/placeNames.js";
import { coordinatesForArea, findAutomaticLocation, geocodeArea } from "../lib/requestLocation.js";

const empty = {
  area: "",
  complaintText: "",
  population: "",
  urgency: "medium",
  vulnerable: false,
  accessibility: "easy",
};
const WAKING_AFTER_MS = 6000;
const PIN_PRIORITY = { unavailable: 0, device: 2, area: 3, manual: 4 };

export default function RequesterPage() {
  const {
    lang: language,
    t,
    errorText,
    num,
    text,
    place,
    itemName,
    urgencyName,
    accessName,
  } = useLanguage();
  const [form, setForm] = useState(empty);
  const [pin, setPin] = useState(null);
  const [pinSource, setPinSource] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [placeLookupState, setPlaceLookupState] = useState("");
  const pinSourceRef = useRef("");
  const placeLookupId = useRef(0);
  const [qty, setQty] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [weights, setWeights] = useState(null);

  // AI report state. Failures never clear `reportText` or the form.
  const [reportText, setReportText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState(""); // a translation key, so the line under the button follows the language
  const [aiError, setAiError] = useState(null); // { key } or { error }, translated when it is shown
  const [ai, setAi] = useState(null); // { result, sourceText } once the AI has filled the form
  const [touched, setTouched] = useState({}); // fields the person edited after the AI draft
  const lastAttempt = useRef(null);

  const applyPin = useCallback((point, source, force = false) => {
    const currentPriority = PIN_PRIORITY[pinSourceRef.current] ?? 0;
    const nextPriority = PIN_PRIORITY[source] ?? 0;
    if (!point || (!force && currentPriority > nextPriority)) return false;
    pinSourceRef.current = source;
    setPinSource(source);
    setPin({ lat: point.lat, lng: point.lng });
    setErrors((current) => {
      if (!current.pin) return current;
      const { pin: _pin, ...rest } = current;
      return rest;
    });
    return true;
  }, []);

  const locateAutomatically = useCallback(async (force = false) => {
    setLocationBusy(true);
    try {
      const result = await findAutomaticLocation();
      applyPin(result.point, result.source, force);
    } catch {
      if (!pinSourceRef.current || force) setPinSource("unavailable");
    } finally {
      setLocationBusy(false);
    }
  }, [applyPin]);

  const locateArea = useCallback(async (area) => {
    const query = String(area ?? "").trim();
    if (query.length < 2 || pinSourceRef.current === "manual") return;
    const lookupId = ++placeLookupId.current;
    setPlaceLookupState("searching");
    try {
      const point = await geocodeArea(query);
      if (lookupId !== placeLookupId.current || pinSourceRef.current === "manual") return;
      if (point) {
        applyPin(point, "area", true);
        setPlaceLookupState("");
      } else {
        setPlaceLookupState("not_found");
      }
    } catch {
      if (lookupId === placeLookupId.current && pinSourceRef.current !== "manual") {
        setPlaceLookupState("not_found");
      }
    }
  }, [applyPin]);

  useEffect(() => {
    locateAutomatically(false);
  }, [locateAutomatically]);

  // Typing a known place or extracting one from a text/voice report places an
  // initial town-centre pin. A pin the requester moved manually is never replaced.
  useEffect(() => {
    const areaPoint = coordinatesForArea(form.area);
    if (areaPoint && pinSourceRef.current !== "manual") {
      placeLookupId.current += 1;
      setPlaceLookupState("");
      applyPin(areaPoint, "area", true);
    }
  }, [applyPin, form.area]);

  const selectedSupplies = ITEMS.filter((item) => Number(qty[item]) > 0).map(
    (item) => ({ item, quantity: Number(qty[item]) }),
  );
  const totalSelectedUnits = selectedSupplies.reduce(
    (total, entry) => total + entry.quantity,
    0,
  );

  useEffect(() => {
    getWeights()
      .then(setWeights)
      .catch(() => {});
  }, []);

  // Changing language also changes a known place name in the form ("Dadu" <-> "دادو"). Names the app does not know stay as typed.
  useEffect(() => {
    setForm((f) => {
      const shown = f.area ? place(f.area) : f.area;
      return shown === f.area ? f : { ...f, area: shown };
    });
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = (k) => setTouched((prev) => ({ ...prev, [k]: true }));
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    touch(k);
  };

  function applyResult(result, sourceText) {
    setForm((current) => ({
      area: result.area ? place(result.area) : "", // shown in the language that is selected
      complaintText: sourceText || result.transcript || result.englishText || current.complaintText,
      population: result.people ?? "",
      urgency: result.urgency ?? "medium",
      vulnerable: result.vulnerable.length > 0,
      accessibility: result.access ?? "easy",
    }));
    const next = {};
    result.supplies.forEach((s) => {
      if (s.qty > 0) next[s.item] = String(s.qty);
    });
    setQty(next);
    setTouched({});
    setErrors({});
    setAi({ result, sourceText });
    if (result.area) locateArea(result.area);
  }

  async function runAnalysis(attempt) {
    lastAttempt.current = attempt;
    setAiBusy(true);
    setAiError(null);
    setAiStatus(attempt.kind === "audio" ? "report.statusUploading" : "report.statusAnalysing");
    const waking = setTimeout(() => setAiStatus("report.statusWaking"), WAKING_AFTER_MS);
    try {
      const result =
        attempt.kind === "audio"
          ? await analyseAudio({ blob: attempt.blob, uiLanguage: language })
          : await analyseReport({ text: attempt.text, uiLanguage: language });
      applyResult(result, attempt.kind === "audio" ? "" : attempt.text);
      setAiStatus("report.statusDone");
    } catch (e) {
      setAiError({ error: e });
      setAiStatus("");
    } finally {
      clearTimeout(waking);
      setAiBusy(false);
    }
  }

  const analyseText = () =>
    runAnalysis({ kind: "text", text: reportText.trim() });
  const analyseRecording = (blob) => runAnalysis({ kind: "audio", blob });
  const retry = () => lastAttempt.current && runAnalysis(lastAttempt.current);

  // Errors hold translation keys (or a raw server message in `formMessage`), so they follow the language.
  function validate() {
    const e = {};
    if (!form.area.trim()) e.area = "requester.errArea";
    if (form.complaintText.trim().length < 10) e.complaintText = "requester.errComplaint";
    if (!pin) e.pin = "requester.errPin";
    if (!(+form.population > 0)) e.population = "requester.errPopulation";
    if (!ITEMS.some((i) => +qty[i] > 0)) e.items = "requester.errItems";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // Only operational fields and the complaint text (used for duplicate checks) go to Express. AI confidence is never sent.
      const body = {
        area: canonicalPlace(form.area.trim()) ?? form.area.trim(), // saved in English letters whatever language is selected
        ...pin,
        population: +form.population,
        urgency: form.urgency,
        vulnerable: form.vulnerable,
        accessibility: form.accessibility,
        complaintText: form.complaintText.trim(),
        items: ITEMS.filter((i) => +qty[i] > 0).map((i) => ({
          item: i,
          qtyNeeded: +qty[i],
        })),
      };
      setCreated(await createRequest(body));
    } catch (e) {
      setErrors({ formMessage: e.message });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setCreated(null);
    setForm(empty);
    setPin(null);
    pinSourceRef.current = "";
    setPinSource("");
    setPlaceLookupState("");
    setQty({});
    setAi(null);
    setTouched({});
    setReportText("");
    setAiError(null);
    setAiStatus("");
    locateAutomatically(false);
  }

  const locationMessage = placeLookupState === "searching"
    ? t("requester.locationSearchingArea")
    : placeLookupState === "not_found"
      ? t("requester.locationAreaNotFound")
      : locationBusy
    ? t("requester.locationFinding")
    : pinSource === "device"
      ? t("requester.locationDevice")
      : pinSource === "area"
          ? t("requester.locationArea", { area: place(canonicalPlace(form.area) ?? form.area) })
          : pinSource === "manual"
            ? t("requester.locationManual")
            : pinSource === "unavailable"
              ? t("requester.locationUnavailable")
              : "";

  // The draft appears above the form: bring it into view so the next step is obvious.
  useEffect(() => {
    if (ai) document.getElementById("confirm-title")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [ai]);

  const aiErrorText = !aiError ? "" : aiError.key ? t(aiError.key) : errorText(aiError.error);

  if (created)
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="panel space-y-4 p-6">
          <h2 className="text-2xl font-bold">
            {t("requester.sentTitle", { area: place(created.area) })}
          </h2>
          <p className="text-sm text-mute">
            {t("requester.sentBody", { score: num(created.score.total) })}
          </p>
          <ScoreBars score={created.score} weights={weights} />
          <div className="flex flex-wrap gap-2">
            <Link to="/tracker" className="btn-lime">
              {t("requester.track")}
            </Link>
            <button className="btn-ghost" onClick={reset}>
              {t("requester.sendAnother")}
            </button>
          </div>
        </div>
      </div>
    );

  // Badge shown beside an AI-filled field; becomes "Edited by you" once the person changes it.
  const badge = (key, confKey, extra = {}) =>
    ai && (
      <div className="mt-1">
        <ConfidenceBadge
          value={ai.result.confidence[confKey]}
          edited={!!touched[key]}
          {...extra}
        />
      </div>
    );

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[420px_1fr] lg:overflow-hidden">
      <div className="space-y-4 lg:overflow-y-auto">
        <AiReportInput
          text={reportText}
          onText={setReportText}
          onAnalyse={analyseText}
          onRecorded={analyseRecording}
          onMicError={(micError) => {
            setAiError(micError);
            setAiStatus("");
            lastAttempt.current = null;
          }}
          busy={aiBusy}
          status={aiStatus ? t(aiStatus) : ""}
          error={aiErrorText}
          canRetry={!!lastAttempt.current}
          onRetry={retry}
        />
        {ai && (
          <ConfirmRequestCard
            result={ai.result}
            sourceText={ai.sourceText}
            hasPin={!!pin}
          />
        )}

        <form
          id="manual-form"
          onSubmit={submit}
          noValidate
          className="panel space-y-4 p-5"
        >
          <h2 className="text-2xl font-bold">{t("requester.title")}</h2>
          <div>
            <label className="label" htmlFor="complaintText">{t("requester.complaint")}</label>
            <textarea
              id="complaintText"
              rows="4"
              maxLength="2000"
              dir="auto"
              className="field resize-y"
              placeholder={t("requester.complaintPlaceholder")}
              value={form.complaintText}
              onChange={(e) => set("complaintText", e.target.value)}
            />
            <div className="mt-1 flex justify-between gap-3 text-xs text-mute">
              <span>{t("requester.complaintHelp")}</span>
              <span dir="ltr">{form.complaintText.length}/2000</span>
            </div>
            {errors.complaintText && <p className="err">{t(errors.complaintText)}</p>}
          </div>
          <div>
            <label className="label" htmlFor="area">
              {t("requester.area")}
            </label>
            <input
              id="area"
              className="field"
              dir="auto"
              value={form.area}
              onChange={(e) => {
                setPlaceLookupState("");
                set("area", e.target.value);
              }}
              onBlur={() => locateArea(form.area)}
            />
            {badge("area", "area")}
            {errors.area && <p className="err">{t(errors.area)}</p>}
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label mb-0">{t("requester.location")}</span>
              <button
                type="button"
                className="btn-ghost px-2.5 py-1 text-xs"
                disabled={locationBusy}
                onClick={() => locateAutomatically(true)}
              >
                {t("requester.useMyLocation")}
              </button>
            </div>
            <p className="text-sm text-mute">
              {pin ? (
                <>
                  {t("requester.pinAt")}{" "}
                  <span dir="ltr">
                    {pin.lat}, {pin.lng}
                  </span>
                </>
              ) : (
                t("requester.pinHint")
              )}
            </p>
            {locationMessage && <p className="mt-1 text-xs text-mute">{locationMessage}</p>}
            {errors.pin && <p className="err">{t(errors.pin)}</p>}
          </div>
          <div>
            <label className="label" htmlFor="pop">
              {t("requester.people")}
            </label>
            <input
              id="pop"
              type="number"
              min="1"
              className="field"
              value={form.population}
              onChange={(e) => set("population", e.target.value)}
            />
            {badge("population", "people", {
              estimate:
                ai?.result.peopleIsEstimate &&
                ai.result.people != null &&
                !touched.population,
            })}
            {errors.population && <p className="err">{t(errors.population)}</p>}
          </div>
          <fieldset>
            <legend className="label">{t("requester.urgency")}</legend>
            <div className="grid grid-cols-4 gap-2">
              {URGENCY.map((u) => (
                <button
                  type="button"
                  key={u}
                  aria-pressed={form.urgency === u}
                  onClick={() => set("urgency", u)}
                  className={`btn text-xs border ${form.urgency === u ? "bg-ink text-white border-ink" : "bg-card border-line"}`}
                >
                  {urgencyName(u)}
                </button>
              ))}
            </div>
            {badge("urgency", "urgency")}
          </fieldset>
          <fieldset>
            <legend className="label">{t("requester.access")}</legend>
            <div className="grid grid-cols-3 gap-2">
              {ACCESS.map((a) => (
                <button
                  type="button"
                  key={a}
                  aria-pressed={form.accessibility === a}
                  onClick={() => set("accessibility", a)}
                  className={`btn text-xs border ${form.accessibility === a ? "bg-ink text-white border-ink" : "bg-card border-line"}`}
                >
                  {accessName(a)}
                </button>
              ))}
            </div>
            {badge("accessibility", "access")}
          </fieldset>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.vulnerable}
                onChange={(e) => set("vulnerable", e.target.checked)}
                className="accent-ink"
              />
              {t("requester.vulnerable")}
            </label>
            {badge("vulnerable", "vulnerable")}
          </div>
          <fieldset>
            <legend className="label">{t("requester.supplies")}</legend>
            <div className="grid grid-cols-2 gap-3">
              {ITEMS.map((i) => (
                <label key={i} className="text-sm">
                  {itemName(i)}
                  <input
                    type="number"
                    min="0"
                    className="field mt-1"
                    value={qty[i] ?? ""}
                    onChange={(e) => {
                      setQty((q) => ({ ...q, [i]: e.target.value }));
                      touch("supplies");
                    }}
                  />
                </label>
              ))}
            </div>
            {badge("supplies", "supplies")}
            <div
              className="mt-3 rounded-panel border border-line bg-paper p-3"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{t("requester.selected")}</span>
                <strong>
                  {t("requester.totalUnits", { n: num(totalSelectedUnits) })}
                </strong>
              </div>
              {selectedSupplies.length ? (
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-mute">
                  {selectedSupplies.map(({ item, quantity }) => (
                    <li key={item} className="flex justify-between gap-2">
                      <span>{itemName(item)}</span>
                      <strong className="text-ink">{num(quantity)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-mute">
                  {t("requester.noneSelected")}
                </p>
              )}
            </div>
            {errors.items && <p className="err">{t(errors.items)}</p>}
          </fieldset>
          {errors.formMessage && (
            <p role="alert" className="err">
              {text(errors.formMessage)}
            </p>
          )}
          <button className="btn-lime w-full" disabled={saving}>
            {saving
              ? t("requester.sending")
              : ai
                ? t("confirm.button")
                : t("confirm.send")}
          </button>
        </form>
      </div>
      <div className="h-[65vh] min-h-[420px] lg:h-full lg:min-h-0">
        <MapView pin={pin} onPick={(point) => applyPin(point, "manual", true)} pinCursor focusPin height="100%" />
      </div>
    </div>
  );
}
