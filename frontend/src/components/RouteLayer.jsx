import { Polyline, Tooltip } from "react-leaflet";

export default function RouteLayer({ routes = [], selectedId }) {
  return routes.filter(Boolean).map((route) => (
    <Polyline key={`${route.depotId}-${route.requestId}`} positions={route.polyline}
      pathOptions={{
        color: route.requestId === selectedId ? "#2F6FDE" : "#6B6F76",
        weight: route.requestId === selectedId ? 5 : 3,
        opacity: route.requestId === selectedId ? 0.95 : 0.65,
        dashArray: route.estimated ? "9 8" : undefined,
      }}>
      <Tooltip>{route.estimated ? "Estimated route" : "Road route"} · {route.distanceKm} km · {route.durationMin} min</Tooltip>
    </Polyline>
  ));
}
