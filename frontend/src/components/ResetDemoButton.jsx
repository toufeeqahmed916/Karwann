import { useState } from "react";
import { resetDemo } from "../lib/api.js";
import { useLang } from "../lib/i18n.jsx";

export default function ResetDemoButton() {
  const { t, text } = useLang();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  async function confirmReset() {
    setResetting(true);
    setError("");
    try {
      await resetDemo();
      window.location.reload();
    } catch (requestError) {
      setError(text(requestError.message));
      setResetting(false);
    }
  }

  return (
    <>
      <button className="btn-ghost shrink-0" onClick={() => setOpen(true)}>{t("reset.button")}</button>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-night/50 p-4" role="presentation" onMouseDown={() => !resetting && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="reset-title" className="panel w-full max-w-md p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("reset.eyebrow")}</p>
            <h2 id="reset-title" className="mt-1 text-2xl font-bold">{t("reset.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-mute">{t("reset.body")}</p>
            {error && <p role="alert" className="mt-3 text-sm text-crit">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)} disabled={resetting}>{t("common.cancel")}</button>
              <button className="btn-primary" onClick={confirmReset} disabled={resetting}>{resetting ? t("reset.resetting") : t("reset.button")}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
