export default function BaselineCard({ summary, baseline }) {
  const improvement = summary.overallFulfilmentPct - baseline.overallFulfilmentPct;
  return (
    <section className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-mute">Baseline comparison</p>
      <h2 className="mt-1 text-xl font-bold">Priority allocation performs better</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-panel bg-lime/30 p-4">
          <p className="text-sm text-mute">Our algorithm</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{summary.overallFulfilmentPct}%</p>
          <p className="mt-1 text-xs text-mute">Critical needs: {summary.criticalFulfilmentPct}%</p>
        </div>
        <div className="rounded-panel bg-paper p-4">
          <p className="text-sm text-mute">First come, first served</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{baseline.overallFulfilmentPct}%</p>
          <p className="mt-1 text-xs text-mute">Critical needs: {baseline.criticalFulfilmentPct}%</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-done">+{improvement} percentage points overall</p>
    </section>
  );
}
