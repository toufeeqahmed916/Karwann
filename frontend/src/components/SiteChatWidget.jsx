import { useEffect, useRef, useState } from "react";
import { askSiteHelper } from "../lib/aiApi.js";
import { useLanguage } from "../lib/i18n.jsx";

let nextId = 1;

/** Small floating help bot for visitors. Only answers questions about using the Karwan website. */
export default function SiteChatWidget() {
  const { lang, t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView?.({ block: "end" }); }, [messages, busy, open]);

  async function send(question) {
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { id: nextId++, role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await askSiteHelper({ question: q, uiLanguage: lang });
      setMessages((m) => [...m, { id: nextId++, role: "bot", text: res.answer, refusal: !res.inScope }]);
    } catch {
      setMessages((m) => [...m, { id: nextId++, role: "bot", text: t("help.error"), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label={t("help.title")}
        className="btn-primary fixed bottom-4 right-4 z-[2500] rounded-full px-5 py-3 shadow-xl">
        <span aria-hidden="true">💬</span> {t("help.open")}
      </button>
    );
  }

  return (
    <section dir={dir} role="dialog" aria-label={t("help.title")}
      className="panel fixed bottom-4 right-4 z-[2500] flex max-h-[min(560px,80vh)] w-[min(360px,calc(100vw-2rem))] flex-col shadow-2xl">
      <header className="flex items-center justify-between gap-2 rounded-t-panel bg-ink px-4 py-3 text-white">
        <h2 className="text-base font-bold">{t("help.title")}</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("help.close")} className="rounded-ui px-2 py-1 text-lg leading-none hover:bg-white/10">×</button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-mute">{t("help.intro")}</p>
            <div className="flex flex-wrap gap-2">
              {["help.sug1", "help.sug2", "help.sug3"].map((key) => (
                <button type="button" key={key} className="btn-ghost px-3 py-1.5 text-start text-xs" onClick={() => send(t(key))} disabled={busy}>{t(key)}</button>
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
            {m.text}
          </div>
        ))}
        {busy && <p className="text-mute" role="status">{t("help.sending")}</p>}
        <div ref={bottom} />
      </div>

      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input dir="auto" maxLength={500} className="field min-w-0 flex-1" value={input} disabled={busy}
          onChange={(e) => setInput(e.target.value)} placeholder={t("help.placeholder")} aria-label={t("help.placeholder")} />
        <button className="btn-lime" disabled={busy || !input.trim()}>{t("help.send")}</button>
      </form>
    </section>
  );
}
