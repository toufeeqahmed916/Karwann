import { Polyline, Tooltip } from "react-leaflet";
import { useLang } from "../lib/i18n.jsx";

export default function RouteLayer({ routes = [], selectedId }) {
  const { t, num } = useLang();
  return routes.filter(Boolean).map((route) => (
    <Polyline key={`${route.depotId}-${route.requestId}`} positions={route.polyline}
      pathOptions={{
        color: route.requestId === selectedId ? "#2F6FDE" : "#6B6F76",
        weight: route.requestId === selectedId ? 5 : 3,
        opacity: route.requestId === selectedId ? 0.95 : 0.65,
        dashArray: route.estimated ? "9 8" : undefined,
      }}>
      <Tooltip>
        <span dir="auto">
          {route.estimated ? t("route.estimated") : t("route.road")} · {t("common.kmValue", { n: num(route.distanceKm) })} · {t("common.minValue", { n: num(route.durationMin) })}
        </span>
      </Tooltip>
    </Polyline>
  ));
}
