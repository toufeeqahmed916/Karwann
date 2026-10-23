import { useEffect, useRef, useState } from "react";
import { askAssistant, transcribeAudio } from "../lib/aiApi.js";
import { useLanguage } from "../lib/i18n.jsx";
import MicButton from "./MicButton.jsx";
import SpeakerButton from "./SpeakerButton.jsx";

const SUGGESTION_KEYS = ["assistant.suggest1", "assistant.suggest2", "assistant.suggest3", "assistant.suggest4"];
const WAKING_AFTER_MS = 6000;

let nextId = 1;
const msg = (fields) => ({ id: nextId++, ...fields });

/** Chat with the scoped assistant. It only displays what the AI service returns; it never computes quantities. */
export default function AssistantPanel() {
  const { lang, t, dir, errorText } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [micError, setMicError] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView?.({ block: "end" }); }, [messages, busy]);

  async function ask(question, { addUser = true } = {}) {
    const q = question.trim();
    if (!q || busy) return;
    if (addUser) setMessages((m) => [...m, msg({ role: "user", text: q })]);
    setInput("");
    setMicError("");
    setBusy(true);
    setStatus(t("assistant.looking"));
    const waking = setTimeout(() => setStatus(t("report.statusWaking")), WAKING_AFTER_MS);
    try {
      const res = await askAssistant({ question: q, uiLanguage: lang });
      setMessages((m) => [...m, msg({ role: "assistant", text: res.answer, inScope: res.inScope, sources: res.sources, lang })]);
    } catch (e) {
      // Error text follows the UI language when the code is known; the question is kept for Retry.
      setMessages((m) => [...m, msg({ role: "assistant", error: true, code: e.code, text: e.message, retryQuestion: q })]);
    } finally {
      clearTimeout(waking);
      setBusy(false);
      setStatus("");
    }
  }

  function retry(message) {
    setMessages((m) => m.filter((x) => x.id !== message.id));
    ask(message.retryQuestion, { addUser: false });
  }

  async function onRecorded(blob) {
    setTranscribing(true);
    setMicError("");
    try {
      const { text } = await transcribeAudio({ blob, targetLanguage: lang });
      setInput(text); // fill the box so the coordinator can check it before sending
    } catch (e) {
      setMicError(errorText(e, "assistant.transcribeError", "assistant.error"));
    } finally {
      setTranscribing(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div dir={dir} className="panel flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-4">
        <h2 className="text-xl font-bold">{t("assistant.title")}</h2>
        <p className="text-sm text-mute">{t("assistant.intro")}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {empty && (
          <div className="space-y-3">
            <p className="text-sm text-mute">{t("assistant.emptyHint")}</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_KEYS.map((key) => (
                <button type="button" key={key} className="btn-ghost text-start" onClick={() => ask(t(key))} disabled={busy}>{t(key)}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ms-auto w-fit max-w-[85%] rounded-panel bg-ink px-4 py-2 text-sm text-white" dir="auto">{m.text}</div>
          ) : m.error ? (
            <div key={m.id} role="alert" className="max-w-[85%] space-y-2 rounded-panel border border-crit px-4 py-3 text-sm">
              <p className="text-crit">{errorText({ code: m.code, message: m.text }, "assistant.fallbackError", "assistant.error")}</p>
              <button type="button" className="btn-ghost" onClick={() => retry(m)} disabled={busy}>{t("report.retry")}</button>
            </div>
          ) : (
            <div key={m.id} className={`max-w-[85%] space-y-2 rounded-panel border px-4 py-3 text-sm ${m.inScope ? "border-line bg-paper" : "border-wait bg-card"}`}>
              {!m.inScope && <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("assistant.outOfScope")}</p>}
              <p dir="auto">{m.text}</p>
              {m.sources?.length > 0 && (
                <p className="text-xs text-mute" dir="auto">{t("assistant.basedOn", { sources: m.sources.map((s) => `${s.type} ${s.id}`).join(", ") })}</p>
              )}
              {m.inScope && <SpeakerButton text={m.text} lang={m.lang} />}
            </div>
          ),
        )}
        {busy && <p className="text-sm text-mute" role="status">{status}</p>}
        <div ref={bottom} />
      </div>

      <form className="space-y-2 border-t border-line p-4" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        {micError && <p role="alert" className="err">{micError}</p>}
        <label className="label" htmlFor="assistant-question">{t("assistant.label")}</label>
        <div className="flex flex-wrap gap-2">
          <input id="assistant-question" dir="auto" maxLength={500} className="field min-w-0 flex-1" value={input}
            onChange={(e) => setInput(e.target.value)} disabled={busy}
            placeholder={transcribing ? t("assistant.listening") : t("assistant.placeholder")} />
          <button className="btn-lime" disabled={busy || transcribing || !input.trim()}>{busy ? t("assistant.asking") : t("assistant.ask")}</button>
        </div>
        <MicButton label={t("mic.askByVoice")} onRecorded={onRecorded} onError={setMicError} disabled={busy || transcribing} />
      </form>
    </div>
  );
}
