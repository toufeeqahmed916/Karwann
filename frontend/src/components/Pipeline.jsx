const STEPS = [
  ["pending", "Pending"],
  ["partially_allocated", "Partial"],
  ["allocated", "Allocated"],
  ["in_transit", "In transit"],
  ["delivered", "Delivered"],
];

export default function Pipeline({ requests }) {
  const counts = Object.fromEntries(STEPS.map(([status]) => [status, requests.filter((request) => request.status === status).length]));
  const total = Math.max(1, requests.length);

  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Relief pipeline</h2>
          <p className="text-sm text-mute">Requests by current delivery status.</p>
        </div>
        <strong>{requests.length} total</strong>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEPS.map(([status, label]) => (
          <div key={status} className="rounded-ui border border-line bg-paper p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-mute">{label}</span>
              <strong>{counts[status]}</strong>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-ink" style={{ width: `${counts[status] / total * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
