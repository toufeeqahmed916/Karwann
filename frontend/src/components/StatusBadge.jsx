import { markerColor } from "../lib/constants.js";
import { useLang } from "../lib/i18n.jsx";

export default function StatusBadge({ request }) {
  const { statusName } = useLang();
  return (
    <span className="inline-flex items-center gap-2 rounded-ui border border-line px-2 py-1 text-xs font-medium">
      <span className="h-2 w-2 rounded-full" style={{ background: markerColor(request) }} />
      {statusName(request.status)}
    </span>
  );
}
