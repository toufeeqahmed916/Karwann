import { useEffect, useRef, useState } from "react";
import { askSiteHelper, transcribeAudio } from "../lib/aiApi.js";
import { useLanguage } from "../lib/i18n.jsx";
import { clearFailure, isTranslating, shownLang, shownText, useAutoTranslate } from "../lib/useAutoTranslate.js";
import MicButton from "./MicButton.jsx";
import SpeakerButton from "./SpeakerButton.jsx";
import helpMascot from "../assets/karwan-help-mascot.png";

const VOICE_KEY = "karwan-voice-replies"; // the same choice as the staff assistant
const MASCOT_MESSAGES = ["help.mascotPrompt", "help.mascotWave", "help.mascotAsk"];
let nextId = 1;

/**
 * Small floating help bot for visitors. Only answers questions about using the Karwan website.
 *
 * Voice agent: press the microphone and ask out loud in English, Urdu or Sindhi. The question is sent straight away
 * and the answer is read aloud in the same language. "Speak answers aloud" does the same for typed questions.
 *
 * Stays mounted while the visitor moves between pages (so the conversation is kept); `hidden` just hides it.
 * Answers already on screen are translated when the language is changed.
 */
export default function SiteChatWidget({ hidden = false }) {
  const { lang, t, dir, errorText } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false); // converting the recording to text
  const [mascotMessage, setMascotMessage] = useState(0);
  const [mascotTyping, setMascotTyping] = useState(false);
  const [micError, setMicError] = useState(null); // { key } or { error }
  const [voiceReplies, setVoiceReplies] = useState(() => {
    try { return localStorage.getItem(VOICE_KEY) === "1"; } catch { return false; }
  });
  const bottom = useRef(null);

  const changeVoiceReplies = (on) => {
    setVoiceReplies(on);
    try { localStorage.setItem(VOICE_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  };

  useAutoTranslate(messages, setMessages, lang);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: "end" }); }, [messages, busy, listening, open]);
  useEffect(() => {
    if (open || hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let typingTimer;
    const interval = setInterval(() => {
      setMascotTyping(true);
      typingTimer = setTimeout(() => {
        setMascotMessage((current) => (current + 1) % MASCOT_MESSAGES.length);
        setMascotTyping(false);
      }, 700);
    }, 4200);
    return () => {
      clearInterval(interval);
      clearTimeout(typingTimer);
    };
  }, [hidden, open]);

  async function send(question, { viaVoice = false } = {}) {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { id: nextId++, role: "user", text: q }]);
    setInput("");
    setMicError(null);
    setBusy(true);
    try {
      const res = await askSiteHelper({ question: q, uiLanguage: lang });
      setMessages((m) => [...m, { id: nextId++, role: "bot", text: res.answer, refusal: !res.inScope, lang, viaVoice }]);
    } catch {
      setMessages((m) => [...m, { id: nextId++, role: "bot", text: "", error: true }]); // wording is added at display time
    } finally {
      setBusy(false);
    }
  }

  // Voice agent: recording -> text -> asked at once. If the words could not be understood, nothing is sent.
  async function onRecorded(blob) {
    setListening(true);
    setMicError(null);
    try {
      const { text } = await transcribeAudio({ blob, targetLanguage: lang });
      await send(text, { viaVoice: true });
    } catch (e) {
      setMicError({ error: e });
    } finally {
      setListening(false);
    }
  }

  if (hidden) return null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label={t("help.title")}
        className="karwan-help-launcher fixed bottom-3 end-3 z-[2500]">
        <span className="karwan-help-callout" aria-hidden="true" aria-live="off">
          {mascotTyping ? (
            <span className="karwan-help-typing">
              <i /><i /><i />
            </span>
          ) : (
            <span key={`${lang}-${mascotMessage}`} className="karwan-help-callout-text">
              {t(MASCOT_MESSAGES[mascotMessage])}
            </span>
          )}
        </span>
        <span className="karwan-help-mascot-wrap" aria-hidden="true">
          <img className="karwan-help-mascot" src={helpMascot} alt="" />
        </span>
      </button>
    );
  }

  const micMessage = !micError ? "" : micError.key ? t(micError.key) : errorText(micError.error, "assistant.transcribeError", "assistant.error");
  const lastBotId = [...messages].reverse().find((m) => m.role === "bot" && !m.error)?.id;

  return (
    <section dir={dir} role="dialog" aria-label={t("help.title")}
      className="panel fixed bottom-4 end-4 z-[2500] flex max-h-[min(600px,85vh)] w-[min(380px,calc(100vw-2rem))] flex-col shadow-2xl">
      <header className="flex items-center justify-between gap-2 rounded-t-panel bg-ink px-4 py-3 text-white">
        <span className="flex min-w-0 items-center gap-2">
          <img src={helpMascot} alt="" className="h-9 w-9 shrink-0 object-contain" aria-hidden="true" />
          <h2 className="truncate text-base font-bold">{t("help.title")}</h2>
        </span>
        <span className="flex items-center gap-1">
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} disabled={busy} className="rounded-ui px-2 py-1 text-xs hover:bg-white/10">{t("chat.clear")}</button>
          )}
          <button type="button" onClick={() => setOpen(false)} aria-label={t("help.close")} className="rounded-ui px-2 py-1 text-lg leading-none hover:bg-white/10">×</button>
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-mute">{t("help.intro")}</p>
            <div className="flex flex-wrap gap-2">
              {["help.sug1", "help.sug2", "help.sug3"].map((key) => (
                <button type="button" key={key} className="btn-ghost px-3 py-1.5 text-start text-xs" onClick={() => send(t(key))} disabled={busy || listening}>{t(key)}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} dir="auto"
            className={`w-fit max-w-[88%] whitespace-pre-line rounded-panel px-3 py-2 ${
              m.role === "user" ? "ms-auto bg-ink text-white"
                : m.error ? "border border-crit text-crit"
                : m.refusal ? "border border-wait bg-card" : "bg-paper"}`}>
            <span className={isTranslating(m, lang) ? "opacity-50" : ""}>{m.error ? t("help.error") : shownText(m, lang)}</span>
            {isTranslating(m, lang) && <div className="mt-1 text-xs text-mute" role="status">{t("translate.working")}</div>}
            {m.failed?.[lang] && (
              <div className="mt-1 text-xs text-crit">
                {t("translate.failed")}{" "}
                <button type="button" className="font-semibold underline" onClick={() => setMessages((all) => all.map((x) => (x.id === m.id ? clearFailure(x, lang) : x)))}>{t("translate.retry")}</button>
              </div>
            )}
            {m.role === "bot" && !m.error && !m.refusal && !isTranslating(m, lang) && (
              <div className="mt-2">
                <SpeakerButton text={shownText(m, lang)} lang={shownLang(m, lang)} autoPlay={(voiceReplies || !!m.viaVoice) && m.id === lastBotId} />
              </div>
            )}
          </div>
        ))}
        {listening && <p className="text-mute" role="status">{t("assistant.listening")}</p>}
        {busy && <p className="text-mute" role="status">{t("help.sending")}</p>}
        <div ref={bottom} />
      </div>

      <form className="space-y-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        {micMessage && <p role="alert" className="err">{micMessage}</p>}
        <div className="flex gap-2">
          <input dir="auto" maxLength={500} className="field min-w-0 flex-1" value={input} disabled={busy || listening}
            onChange={(e) => setInput(e.target.value)} placeholder={t("help.placeholder")} aria-label={t("help.placeholder")} />
          <button className="btn-lime" disabled={busy || listening || !input.trim()}>{t("help.send")}</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MicButton label={t("mic.askByVoice")} onRecorded={onRecorded} onError={setMicError} disabled={busy || listening} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" className="accent-ink" checked={voiceReplies} onChange={(e) => changeVoiceReplies(e.target.checked)} />
            {t("assistant.voiceReplies")}
          </label>
        </div>
      </form>
    </section>
  );
}
