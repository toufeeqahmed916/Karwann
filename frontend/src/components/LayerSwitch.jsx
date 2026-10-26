import { useLang } from "../lib/i18n.jsx";

export const HEAT_LAYERS = ["need", "urgency", "supplyGap", "deliveryDelay", "accessibility"];

export default function LayerSwitch({ value, onChange }) {
  const { t } = useLang();
  return (
    <div className="rounded-panel border border-line bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="me-1 text-xs font-semibold uppercase tracking-wider text-mute">{t("layer.title")}</span>
        {HEAT_LAYERS.map((key) => (
          <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={value === key}
            className={`rounded-ui px-3 py-1.5 text-xs font-semibold ${value === key ? "bg-ink text-white" : "bg-paper hover:bg-line"}`}>
            {t(`layer.${key}`)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-mute">
        <span>{t("layer.lower")}</span>
        <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-lime via-wait to-crit" />
        <span>{t("layer.higher")}</span>
      </div>
    </div>
  );
}
