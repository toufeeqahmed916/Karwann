export const HEAT_LAYERS = [
  ["need", "Need"],
  ["urgency", "Urgency"],
  ["supplyGap", "Supply gap"],
  ["deliveryDelay", "Delivery delay"],
  ["accessibility", "Accessibility"],
];

export default function LayerSwitch({ value, onChange }) {
  return (
    <div className="rounded-panel border border-line bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-mute">Heat layer</span>
        {HEAT_LAYERS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => onChange(key)}
            className={`rounded-ui px-3 py-1.5 text-xs font-semibold ${value === key ? "bg-ink text-white" : "bg-paper hover:bg-line"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-mute">
        <span>Lower</span>
        <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-lime via-wait to-crit" />
        <span>Higher</span>
      </div>
    </div>
  );
}
