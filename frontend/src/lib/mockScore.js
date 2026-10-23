// MOCK MODE ONLY. The real score is computed by the backend (server/core/score.js).
const U = { low: .25, medium: .5, high: .75, critical: 1 };
const A = { easy: 0, medium: .5, hard: 1 };
export function scoreRequest(r, w, maxPop) {
  const parts = {
    urgency: U[r.urgency] * 100 * w.urgency,
    population: Math.min(r.population / maxPop, 1) * 100 * w.population,
    vulnerability: (r.vulnerable ? 1 : 0) * 100 * w.vulnerability,
    waiting: Math.min(r.hoursWaiting / 36, 1) * 100 * w.waiting,
    accessibility: A[r.accessibility] * 100 * w.accessibility,
  };
  const total = Math.round(Object.values(parts).reduce((a, b) => a + b, 0));
  Object.keys(parts).forEach((k) => (parts[k] = Math.round(parts[k])));
  return { total, parts };
}
export function rescoreAll(list, w) {
  const maxPop = Math.max(...list.map((r) => r.population), 1);
  return list.map((r) => ({ ...r, score: scoreRequest(r, w, maxPop) })).sort((a, b) => b.score.total - a.score.total);
}
