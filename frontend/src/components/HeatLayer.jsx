import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

const URGENCY_VALUE = { low: 0.2, medium: 0.45, high: 0.75, critical: 1 };
const ACCESS_VALUE = { easy: 0.15, medium: 0.55, hard: 1 };

function rawValue(request, layer) {
  const needed = request.items.reduce((total, item) => total + item.qtyNeeded, 0);
  const remaining = request.items.reduce((total, item) => total + Math.max(0, item.qtyNeeded - item.qtyAllocated), 0);
  if (layer === "need") return remaining;
  if (layer === "urgency") return URGENCY_VALUE[request.urgency] || 0;
  if (layer === "supplyGap") return needed ? remaining / needed : 0;
  if (layer === "deliveryDelay") return Math.min(request.hoursWaiting / 36, 1);
  if (layer === "accessibility") return ACCESS_VALUE[request.accessibility] || 0;
  return 0;
}

export default function HeatLayer({ requests, layer }) {
  const map = useMap();
  const points = useMemo(() => {
    const values = requests.map((request) => rawValue(request, layer));
    const maximum = Math.max(...values, 1);
    return requests.map((request, index) => [request.lat, request.lng, Math.max(0.08, values[index] / maximum)]);
  }, [requests, layer]);

  useEffect(() => {
    const heat = L.heatLayer(points, {
      radius: 34,
      blur: 25,
      maxZoom: 10,
      minOpacity: 0.25,
      gradient: { 0.2: "#C4F135", 0.5: "#E3C21B", 0.75: "#EF8A1F", 1: "#D93636" },
    }).addTo(map);
    return () => map.removeLayer(heat);
  }, [map, points]);

  return null;
}
