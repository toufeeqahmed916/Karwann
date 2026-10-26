import { useLang } from "../lib/i18n.jsx";

export default function KpiCard({ label, value, note, tone = "default" }) {
  const { num } = useLang();
  const toneClass = tone === "danger" ? "border-crit/30" : tone === "success" ? "border-done/30" : "border-line";
  return (
    <article className={`panel p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{typeof value === "number" ? num(value) : value}</p>
      {note && <p className="mt-1 text-xs text-mute">{note}</p>}
    </article>
  );
}
