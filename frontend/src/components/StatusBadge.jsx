import { STATUS_LABEL, markerColor } from "../lib/constants.js";

export default function StatusBadge({ request }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-ui border border-line px-2 py-1 text-xs font-medium">
      <span className="h-2 w-2 rounded-full" style={{ background: markerColor(request) }} />
      {STATUS_LABEL[request.status]}
    </span>
  );
}
