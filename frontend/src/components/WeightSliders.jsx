import { SCORE_PARTS } from "../lib/constants.js";
import { useLang } from "../lib/i18n.jsx";

// Five sliders. Changing one rebalances the others so the total stays 100%.
export default function WeightSliders({ weights, onChange, busy }) {
  const { t } = useLang();
  function set(key, pct) {
    const v = pct / 100;
    const others = Object.keys(weights).filter((k) => k !== key);
    const restOld = others.reduce((a, k) => a + weights[k], 0);
    const next = { ...weights, [key]: v };
    others.forEach((k) => (next[k] = restOld > 0 ? (weights[k] / restOld) * (1 - v) : (1 - v) / others.length));
    onChange(next);
  }
  return (
    <div className="space-y-3">
      {SCORE_PARTS.map(([key]) => (
        <label key={key} className="block">
          <span className="mb-1 flex justify-between text-sm">
            <span>{t(`score.${key}`)}</span>
            <span className="font-semibold" dir="ltr">{Math.round(weights[key] * 100)}%</span>
          </span>
          <input type="range" min="0" max="80" value={Math.round(weights[key] * 100)} disabled={busy}
            onChange={(e) => set(key, +e.target.value)} className="w-full accent-ink" />
        </label>
      ))}
    </div>
  );
}
