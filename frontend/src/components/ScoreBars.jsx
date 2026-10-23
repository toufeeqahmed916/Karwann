import { SCORE_PARTS } from "../lib/constants.js";

const DEFAULT_MAX_POINTS = {
  urgency: 35,
  population: 25,
  vulnerability: 15,
  waiting: 15,
  accessibility: 10,
};

// Score breakdown: one bar per factor. Bar width is the points that factor added.
export default function ScoreBars({ score, weights }) {
  return (
    <div className="space-y-2" aria-label="Priority score breakdown">
      {SCORE_PARTS.map(([key, label]) => {
        const pts = score.parts[key];
        const max = weights
          ? Math.round(weights[key] * 100)
          : DEFAULT_MAX_POINTS[key];
        return (
          <div key={key}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{label}</span>
              <span className="font-semibold">{pts} of {max}</span>
            </div>
            <div className="h-2 rounded-ui bg-paper">
              <div className="h-2 rounded-ui bg-ink" style={{ width: `${max ? Math.min(100, (pts / max) * 100) : 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
