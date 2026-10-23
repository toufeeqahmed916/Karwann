import MicButton from "./MicButton.jsx";
import { useLanguage } from "../lib/i18n.jsx";

export const MAX_REPORT_CHARS = 5000;

/** Describe the situation by typing or speaking. Nothing here saves a request. */
export default function AiReportInput({
  text, onText, onAnalyse, onRecorded, onMicError,
  busy, status, error, canRetry, onRetry,
}) {
  const { t, dir } = useLanguage();
  return (
    <section dir={dir} className="panel space-y-3 p-5" aria-labelledby="ai-report-title">
      <div>
        <h3 id="ai-report-title" className="text-lg font-bold">{t("report.title")}</h3>
        <p className="text-sm text-mute">{t("report.intro")}</p>
      </div>

      <div>
        <label className="label" htmlFor="ai-report">{t("report.label")}</label>
        <textarea id="ai-report" dir="auto" rows={5} maxLength={MAX_REPORT_CHARS} className="field"
          value={text} onChange={(e) => onText(e.target.value)} disabled={busy}
          placeholder={t("report.placeholder")} />
        <p className="mt-1 text-xs text-mute" dir="ltr">{text.length.toLocaleString()} / {MAX_REPORT_CHARS.toLocaleString()}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-lime" onClick={onAnalyse} disabled={busy || !text.trim()}>
          {busy ? t("report.analysing") : t("report.analyse")}
        </button>
        <MicButton onRecorded={onRecorded} onError={onMicError} disabled={busy} />
      </div>

      <p role="status" aria-live="polite" className="text-sm text-mute">{status}</p>
      {error && (
        <div role="alert" className="space-y-2">
          <p className="err">{error}</p>
          <div className="flex flex-wrap gap-2">
            {canRetry && <button type="button" className="btn-ghost" onClick={onRetry} disabled={busy}>{t("report.retry")}</button>}
            <a href="#manual-form" className="btn-ghost">{t("report.manual")}</a>
          </div>
        </div>
      )}
    </section>
  );
}
