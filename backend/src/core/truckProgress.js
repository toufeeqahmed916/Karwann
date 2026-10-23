import { haversineKm } from "./allocation.js";

export function positionAlongRoute(polyline, progressPct) {
  if (!Array.isArray(polyline) || polyline.length === 0) {
    return { lat: null, lng: null };
  }
  if (polyline.length === 1 || progressPct <= 0) {
    return { lat: polyline[0][0], lng: polyline[0][1] };
  }
  if (progressPct >= 100) {
    const last = polyline.at(-1);
    return { lat: last[0], lng: last[1] };
  }

  const segments = [];
  let total = 0;
  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = { lat: polyline[index][0], lng: polyline[index][1] };
    const end = { lat: polyline[index + 1][0], lng: polyline[index + 1][1] };
    const length = haversineKm(start, end);
    segments.push({ start, end, length });
    total += length;
  }
  if (total === 0) return segments[0].start;

  let target = total * (progressPct / 100);
  for (const segment of segments) {
    if (target <= segment.length) {
      const ratio = segment.length ? target / segment.length : 0;
      return {
        lat: segment.start.lat + (segment.end.lat - segment.start.lat) * ratio,
        lng: segment.start.lng + (segment.end.lng - segment.start.lng) * ratio,
      };
    }
    target -= segment.length;
  }
  return segments.at(-1).end;
}
